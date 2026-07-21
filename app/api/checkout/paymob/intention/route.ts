import { auth } from "@/lib/auth/supabase-auth";
import { z } from "zod";
import {
  getCheckoutOrderByIdempotencyKey,
  insertCheckoutOrder,
  updatePaymobAcceptOrderId,
} from "@/lib/db/orders";
import { getUserBySupabaseId } from "@/lib/db/users";
import { resolveCheckoutLineItems, type ResolvedCheckoutLine } from "@/lib/checkout/resolve-line-items";
import { onOrderCreated } from "@/lib/email/automation/triggers";
import { scheduleOrderConfirmed } from "@/lib/notifications/schedule";
import {
  buildPaymobIntentionBillingData,
  buildPaymobIntentionItems,
  createPaymobIntention,
  PaymobApiError,
} from "@/lib/paymob/intention";
import {
  getPaymobConfigStatus,
  hasPaymobOnlineCheckout,
  resolvePaymobIntegrationId,
} from "@/lib/paymob/config";
import { siteConfig } from "@/lib/site-config";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";
import {
  fetchActivePromoByCode,
  validatePromoForCartAsync,
} from "@/lib/promo/validate-promo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkGiftBoxSnapshotAvailability } from "@/lib/gift-box/check-availability";
import { giftBoxOrderSnapshotSchema } from "@/lib/gift-box/order-snapshot";
import { bundleOfferOrderSnapshotSchema } from "@/lib/offers/order-snapshot";
import { markAbandonedCartRecovered } from "@/lib/cart/abandoned";
import { validateBundleOfferSnapshot } from "@/lib/offers/order-snapshot";
import {
  fetchRecoveryDiscountByCode,
  markRecoveryDiscountUsed,
  validateRecoveryDiscountForCart,
} from "@/lib/cart/recovery-discount";

const GIFT_WRAP_FEE_EGP = 30;

/**
 * Shipping is now optional — Paymob collects real billing data on their hosted page.
 * When absent, we use the authenticated user's profile or safe placeholder values.
 */
const BodySchema = z
  .object({
    items: z.array(
      z.object({
        id: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
        variant_id: z.string().uuid().optional(),
        addons: z
          .array(
            z.object({
              addon_id: z.string().uuid(),
              options: z.array(
                z.object({
                  option_id: z.string().min(1),
                  quantity: z.number().int().min(1).max(99),
                  price_snapshot: z.number().nonnegative(),
                }),
              ),
            }),
          )
          .optional(),
      }),
    ),
    /** Optional — Paymob collects real shipping info on their hosted page. */
    shipping: z
      .object({
        name: z.string().min(2),
        phone: z.string().regex(/^01[0125][0-9]{8}$/),
        address: z.string().min(5),
        city: z.string().min(2),
        notes: z.string().optional(),
        email: z.union([z.string().email(), z.literal("")]).optional(),
      })
      .optional(),
    promo_code: z.string().min(3).max(20).optional(),
    gift_box: giftBoxOrderSnapshotSchema.optional(),
    bundle_offers: z.array(bundleOfferOrderSnapshotSchema).optional(),
    idempotency_key: z.string().uuid().optional(),
  })
  .refine((d) => d.items.length > 0 || d.gift_box || (d.bundle_offers?.length ?? 0) > 0, {
    message: "Cart must include products, a gift box, or bundle offers",
  });

async function resolveSupabaseUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const { userId } = await auth();
  if (!userId) return null;
  const row = await getUserBySupabaseId(userId);
  return row?.id ?? null;
}

/**
 * Resolves billing data for Paymob.
 * Priority: provided shipping object → authenticated user profile → safe placeholders.
 * Paymob will collect real shipping/billing details on their hosted checkout page.
 */
async function resolveBillingData(
  shipping: { name: string; phone: string; address: string; city: string; email?: string; notes?: string } | undefined,
  dbUserId: string | null,
) {
  if (shipping) {
    return {
      name: shipping.name,
      email: shipping.email ?? "",
      phone: shipping.phone,
      street: `${shipping.address}, ${shipping.city}`,
      city: shipping.city,
      notes: shipping.notes ?? "",
      rawEmail: shipping.email && shipping.email.length > 0 ? shipping.email : undefined,
    };
  }

  // Try to pull from authenticated user profile
  if (dbUserId) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: user } = await supabase
        .from("users")
        .select("full_name, email, phone")
        .eq("id", dbUserId)
        .single();
      if (user) {
        return {
          name: (user.full_name as string | null) ?? "Customer",
          email: (user.email as string | null) ?? "",
          phone: (user.phone as string | null) ?? "+201000000000",
          street: "NA",
          city: "Cairo",
          notes: "",
          rawEmail: (user.email as string | null) ?? undefined,
        };
      }
    } catch {
      // fall through to placeholders
    }
  }

  // Safe guest placeholders — Paymob hosted page will collect the real data
  return {
    name: "Guest Customer",
    email: "",
    phone: "+201000000000",
    street: "NA",
    city: "Cairo",
    notes: "",
    rawEmail: undefined as string | undefined,
  };
}

/**
 * Single-step Paymob checkout:
 * - Validates cart items and promo code server-side.
 * - Creates the order in the database.
 * - Creates a Paymob payment intention.
 * - Returns the Paymob hosted checkout URL.
 *
 * Shipping/billing info is optional — Paymob collects it on their hosted page.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    items,
    shipping,
    promo_code: promoCodeRaw,
    gift_box: giftBox,
    bundle_offers: bundleOffers = [],
    idempotency_key: idempotencyKey,
  } = parsed.data;

  // Delivery scheduling is no longer collected from the UI.
  const deliveryPersist = null;

  let resolved: ResolvedCheckoutLine[] = [];
  let subtotal = 0;

  if (giftBox) {
    const availability = await checkGiftBoxSnapshotAvailability(giftBox);
    if (!availability.canReorder) {
      return Response.json(
        {
          ok: false,
          error: "Some gift box items are unavailable",
          error_ar: "بعض منتجات صندوق الهدايا غير متوفرة",
          unavailable: availability.unavailableItems,
        },
        { status: 400 },
      );
    }
    subtotal += giftBox.totalPrice;
  }

  for (const bundleOffer of bundleOffers) {
    const validation = await validateBundleOfferSnapshot(bundleOffer);
    if (!validation.ok) {
      return Response.json(
        { ok: false, error: validation.error, error_ar: validation.error_ar },
        { status: 400 },
      );
    }
    subtotal += bundleOffer.offer_price_egp;
  }

  if (items.length > 0) {
    const pricing = await resolveCheckoutLineItems(items);
    if (!pricing.ok) {
      return Response.json(
        { ok: false, error: pricing.error },
        { status: pricing.status },
      );
    }
    resolved = pricing.lines;
    subtotal += pricing.subtotal;
  }

  const threshold = await getFreeShippingThresholdEgp();

  let discountAmount = 0;
  let appliedPromoCode: string | null = null;
  let appliedPromoId: string | null = null;
  let isRecoveryPromo = false;
  let promoFreeShipping = false;

  const promoUserId = await resolveSupabaseUserId();

  if (promoCodeRaw?.trim()) {
    try {
      const supabase = createSupabaseAdminClient();
      const promo = await fetchActivePromoByCode(supabase, promoCodeRaw.trim());
      let validation = await validatePromoForCartAsync(promo, {
        cartSubtotal: subtotal,
        cartProductIds: resolved.map((l) => l.id),
        userId: promoUserId,
        supabase,
      });
      if (!validation.valid) {
        const recovery = await fetchRecoveryDiscountByCode(supabase, promoCodeRaw.trim());
        validation = validateRecoveryDiscountForCart(recovery, subtotal);
        if (validation.valid) {
          isRecoveryPromo = true;
        }
      }
      if (validation.valid) {
        discountAmount = validation.discount_amount;
        appliedPromoCode = validation.promo.code;
        appliedPromoId = isRecoveryPromo ? null : validation.promo.id;
        promoFreeShipping = validation.free_shipping;
      } else {
        return Response.json(
          { ok: false, error: validation.error_en, error_ar: validation.error_ar },
          { status: 400 },
        );
      }
    } catch (err) {
      console.error("promo validation failed", err);
      return Response.json({ ok: false, error: "Promo validation failed" }, { status: 500 });
    }
  }

  let deliveryFee = subtotal >= threshold ? 0 : siteConfig.standardDeliveryFeeEgp;
  if (promoFreeShipping) deliveryFee = 0;

  const giftWrappingFee = giftBox ? GIFT_WRAP_FEE_EGP : 0;

  const total = Math.max(0, subtotal - discountAmount + deliveryFee + giftWrappingFee);

  // Verify Paymob is configured
  const paymentMethod = "card";
  const paymobConfig = getPaymobConfigStatus();
  const integrationId = resolvePaymobIntegrationId(paymentMethod);
  const hasPaymobOnline = hasPaymobOnlineCheckout(paymentMethod);

  if (!hasPaymobOnline) {
    const missing: string[] = [];
    if (!paymobConfig.secretKey) missing.push("PAYMOB_SECRET_KEY or PAYMOB_API_KEY");
    if (!paymobConfig.publicKey) missing.push("PAYMOB_PUBLIC_KEY");
    if (!paymobConfig.hmacSecret) missing.push("PAYMOB_HMAC_SECRET");
    if (!paymobConfig.integrationCard) missing.push("PAYMOB_INTEGRATION_ID_CARD");
    return Response.json(
      {
        ok: false,
        error:
          missing.length > 0
            ? `Paymob configuration incomplete: ${missing.join(", ")}`
            : "Paymob integration ID missing.",
        error_ar:
          missing.length > 0
            ? `إعداد Paymob غير مكتمل: ${missing.join("، ")}`
            : "معرف تكامل Paymob غير موجود.",
      },
      { status: 503 },
    );
  }

  if (!integrationId) {
    return Response.json({ ok: false, error: "Invalid Paymob integration" }, { status: 400 });
  }

  // Idempotency check
  if (idempotencyKey) {
    const existing = await getCheckoutOrderByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (existing.payment_status === "paid") {
        return Response.json({
          ok: true,
          configured: false,
          alreadyPaid: true,
          paymentMethod,
          orderId: String(existing.order_number),
          totalEgp: Number(existing.total_egp),
          message: "Order already paid.",
        });
      }
    }
  }

  const guestRef = `CB-${Date.now().toString(36)}`.toUpperCase();
  const dbUserId = await resolveSupabaseUserId();

  // Resolve billing data — from provided shipping, user profile, or safe placeholders
  const billing = await resolveBillingData(shipping, dbUserId);

  const shippingAddress = {
    name: billing.name,
    phone: billing.phone,
    address: billing.street,
    city: billing.city,
    notes: billing.notes,
    email: billing.email,
    guestRef,
  };

  const orderLines = [
    ...resolved.map((l) => ({
      slug: l.id,
      name: l.name,
      unitPrice: l.baseUnitPrice,
      quantity: l.quantity,
      selectedAddons: l.selectedAddons,
      addonsTotalUnitPrice: l.addonsTotalUnitPrice,
      finalUnitPrice: l.finalUnitPrice,
      variantId: l.variantId ?? null,
      variantSnapshot: l.variantSnapshot ?? null,
    })),
    ...(giftBox
      ? [
          {
            slug: "gift-box:custom",
            name: "Custom Gift Box",
            unitPrice: giftBox.totalPrice,
            quantity: 1,
            skipProductLookup: true,
            productSnapshot: { type: "gift_box", snapshot: giftBox },
            finalUnitPrice: giftBox.totalPrice,
          },
        ]
      : []),
    ...bundleOffers.map((bundleOffer) => ({
      slug: `bundle-offer:${bundleOffer.offer_id}`,
      name: bundleOffer.name_en,
      unitPrice: bundleOffer.offer_price_egp,
      quantity: 1,
      skipProductLookup: true,
      productSnapshot: { type: "bundle_offer", snapshot: bundleOffer },
      finalUnitPrice: bundleOffer.offer_price_egp,
    })),
  ];

  const paymobProductLines = [
    ...resolved.map((line) => ({
      id: line.id,
      name: line.name,
      unitPrice: line.finalUnitPrice,
      quantity: line.quantity,
    })),
    ...(giftBox
      ? [
          {
            id: "gift-box",
            name: "Custom Gift Box",
            unitPrice: giftBox.totalPrice,
            quantity: 1,
          },
        ]
      : []),
    ...bundleOffers.map((bundleOffer) => ({
      id: `bundle-offer:${bundleOffer.offer_id}`,
      name: bundleOffer.name_en,
      unitPrice: bundleOffer.offer_price_egp,
      quantity: 1,
    })),
  ];

  const amountCents = Math.round(total * 100);
  const paymobItems = buildPaymobIntentionItems(
    paymobProductLines,
    deliveryFee,
    discountAmount,
    giftWrappingFee,
  );
  const itemsSum = paymobItems.reduce((s, i) => s + i.amount, 0);
  if (itemsSum !== amountCents) {
    console.error("Paymob intention items sum mismatch", { itemsSum, amountCents, paymobItems });
    return Response.json({ ok: false, error: "Amount mismatch" }, { status: 500 });
  }

  try {
    const inserted = await insertCheckoutOrder({
      userId: dbUserId,
      lines: orderLines,
      subtotalEgp: subtotal,
      deliveryFeeEgp: deliveryFee,
      discountAmountEgp: discountAmount,
      promoCode: appliedPromoCode,
      promoId: appliedPromoId,
      totalEgp: total,
      paymentMethod,
      paymentStatus: "unpaid",
      shippingAddress,
      notes: `Paymob checkout · ${guestRef}`,
      guestEmail: billing.rawEmail ?? null,
      giftWrappingFeeEgp: giftWrappingFee,
      deliveryScheduling: deliveryPersist,
      orderType: giftBox ? "gift_box" : "standard",
      giftBoxSnapshot: giftBox ?? null,
      checkoutIdempotencyKey: idempotencyKey ?? null,
    });

    if (!inserted) {
      return Response.json(
        { ok: false, error: "Failed to save order before payment" },
        { status: 500 },
      );
    }

    const specialReference = String(inserted.orderNumber);
    const paymobBilling = buildPaymobIntentionBillingData({
      name: billing.name,
      email: billing.email || "guest@cookiebite.local",
      phone: billing.phone,
      street: billing.street,
      city: billing.city,
    });

    const intention = await createPaymobIntention({
      amountCents,
      integrationId,
      items: paymobItems,
      billingData: paymobBilling,
      specialReference,
      extras: { order_id: inserted.id, guest_ref: guestRef },
    });

    await updatePaymobAcceptOrderId(inserted.id, intention.intentionOrderId);

    if (inserted.id) {
      scheduleOrderConfirmed(inserted.id);
    }

    try {
      await markAbandonedCartRecovered({
        userId: dbUserId,
        email: billing.rawEmail ?? null,
      });
      if (isRecoveryPromo && appliedPromoCode) {
        const supabase = createSupabaseAdminClient();
        await markRecoveryDiscountUsed(supabase, appliedPromoCode);
      }
    } catch (recoveryErr) {
      console.error("abandoned cart recovery cleanup failed", recoveryErr);
    }

    if (billing.rawEmail) {
      try {
        await onOrderCreated({
          email: billing.rawEmail,
          userId: dbUserId,
          userName: billing.name,
          orderId: specialReference,
          orderItems: [
            ...resolved.map((line) => `${line.name} x${line.quantity}`),
            ...(giftBox ? [`Custom Gift Box (${giftBox.totalItems} items)`] : []),
          ].join(", "),
          totalPrice: total.toFixed(2),
        });
      } catch (eventError) {
        console.error("order_created email trigger failed", eventError);
      }
    }

    return Response.json({
      ok: true,
      configured: true,
      paymentMethod,
      paymentUrl: intention.paymentUrl,
      clientSecret: intention.clientSecret,
      orderId: specialReference,
      persisted: true,
      paymobOrderId: intention.intentionOrderId,
      paymobIntentionId: intention.intentionId,
      subtotalEgp: subtotal,
      deliveryFeeEgp: deliveryFee,
      discountAmountEgp: discountAmount,
      promoCode: appliedPromoCode,
      promoId: appliedPromoId,
      totalEgp: total,
      lines: resolved,
    });
  } catch (err) {
    console.error("Paymob checkout failed", err);
    if (err instanceof PaymobApiError) {
      const status =
        err.status === 401 || err.status === 403
          ? 502
          : err.status === 404 || err.status === 422
            ? 400
            : err.status >= 500
              ? 502
              : err.status;
      return Response.json(
        {
          ok: false,
          error: err.message,
          error_ar: "فشل إنشاء الدفع — يرجى المحاولة مرة أخرى.",
          paymob_status: err.status,
        },
        { status },
      );
    }
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Paymob request failed",
      },
      { status: 502 },
    );
  }
}
