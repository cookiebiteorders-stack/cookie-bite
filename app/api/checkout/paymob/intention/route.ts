import { auth } from "@/lib/auth/supabase-auth";
import { z } from "zod";
import { logStructuredError } from "@/lib/logger";
import {
  getCheckoutOrderByIdempotencyKey,
  insertCheckoutOrder,
  insertCheckoutOrderTransactional,
  updatePaymobAcceptOrderId,
  markOrderGatewayInitFailed,
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
  validatePaymobEnvConsistency,
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
import { requireCsrfProtection } from "@/lib/security/csrf";

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
        phone_secondary: z.union([z.string().regex(/^01[0125][0-9]{8}$/), z.null()]).optional(),
        address: z.string().min(3),
        city: z.string().min(2),
        governorate: z.union([z.string(), z.null()]).optional(),
        notes: z.union([z.string(), z.null()]).optional(),
        email: z.union([z.string().email(), z.literal(""), z.null()]).optional(),
        delivery_date: z.union([z.string(), z.null()]).optional(),
        delivery_time: z.union([z.string(), z.null()]).optional(),
        latitude: z.union([z.number(), z.null()]).optional(),
        longitude: z.union([z.number(), z.null()]).optional(),
        place_label: z.union([z.string(), z.null()]).optional(),
      })
      .optional(),
    promo_code: z.string().min(3).max(20).optional(),
    gift_box: giftBoxOrderSnapshotSchema.optional(),
    bundle_offers: z.array(bundleOfferOrderSnapshotSchema).optional(),
    idempotency_key: z.string().uuid().optional(),
    payment_method: z.enum(["card", "wallet", "cash_on_delivery"]),
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
  shipping: { 
    name: string; 
    phone: string; 
    phone_secondary?: string | null;
    address: string; 
    city: string; 
    governorate?: string | null;
    notes?: string | null; 
    email?: string | null;
    delivery_date?: string | null;
    delivery_time?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    place_label?: string | null;
  } | null | undefined,
  dbUserId: string | null,
) {
  if (shipping) {
    return {
      name: shipping.name,
      email: shipping.email || undefined,
      phone: shipping.phone,
      phone_secondary: shipping.phone_secondary || undefined,
      street: `${shipping.address}, ${shipping.city}`,
      city: shipping.city,
      governorate: shipping.governorate || undefined,
      notes: shipping.notes || undefined,
      delivery_date: shipping.delivery_date || undefined,
      delivery_time: shipping.delivery_time || undefined,
      latitude: shipping.latitude || undefined,
      longitude: shipping.longitude || undefined,
      place_label: shipping.place_label || undefined,
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
          email: (user.email as string | null) || undefined,
          phone: (user.phone as string | null) ?? "+201000000000",
          phone_secondary: undefined,
          street: "NA",
          city: "Cairo",
          governorate: undefined,
          notes: undefined,
          delivery_date: undefined,
          delivery_time: undefined,
          latitude: undefined,
          longitude: undefined,
          place_label: undefined,
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
    email: undefined,
    phone: "+201000000000",
    phone_secondary: undefined,
    street: "NA",
    city: "Cairo",
    governorate: undefined,
    notes: undefined,
    delivery_date: undefined,
    delivery_time: undefined,
    latitude: undefined,
    longitude: undefined,
    place_label: undefined,
    rawEmail: undefined as string | undefined,
  };
}

/**
 * Single-step checkout:
 * - Validates cart items and promo code server-side.
 * - Creates the order in the database.
 * - For Paymob (card/wallet): Creates a Paymob payment intention and returns the hosted checkout URL.
 * - For COD: Creates order without payment intention and returns order confirmation.
 *
 * Shipping/billing info is optional — Paymob collects it on their hosted page for Paymob payments.
 */
export async function POST(req: Request) {
  // Validate CSRF token for state-changing operation (payment initiation)
  // Skip CSRF validation in development for easier testing
  if (process.env.NODE_ENV === 'production') {
    const csrfCheck = await requireCsrfProtection(req);
    if (!csrfCheck.valid) {
      console.error("[Paymob Intention] CSRF validation failed:", csrfCheck.error);
      return Response.json(
        { ok: false, error: csrfCheck.error || "CSRF validation failed", error_ar: "فشل التحقق من CSRF" },
        { status: 403 }
      );
    }
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    console.error("[Paymob Intention] Validation failed:", JSON.stringify(parsed.error.flatten(), null, 2));
    console.error("[Paymob Intention] Received body:", JSON.stringify(json, null, 2));
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
    payment_method: paymentMethodParam,
  } = parsed.data;

  // Delivery scheduling is no longer collected from the UI.
  const deliveryPersist = null;

  let resolved: ResolvedCheckoutLine[] = [];
  let subtotal = 0;
  // Never trust `gift_box.totalPrice`/`items[].price` from the client — always
  // recomputed from the DB by checkGiftBoxSnapshotAvailability().
  let verifiedGiftBox: typeof giftBox = undefined;

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
    verifiedGiftBox = availability.verifiedSnapshot;
    subtotal += verifiedGiftBox.totalPrice;
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

  // CHECKOUT-01: Resolve delivery fee from shipping_zones based on governorate
  let zoneDeliveryFee = siteConfig.standardDeliveryFeeEgp;
  let zoneFreeThreshold = threshold;
  
  // Extract governorate from shipping data if available
  const governorate = shipping?.governorate || shipping?.city;
  
  if (governorate) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: zone } = await supabase
        .from("shipping_zones")
        .select("base_fee_egp, free_shipping_threshold_egp")
        .eq("is_active", true)
        .contains("cities", [governorate])
        .maybeSingle();
      
      if (zone) {
        zoneDeliveryFee = Number(zone.base_fee_egp) || siteConfig.standardDeliveryFeeEgp;
        if (zone.free_shipping_threshold_egp !== null) {
          zoneFreeThreshold = Number(zone.free_shipping_threshold_egp);
        }
      }
    } catch (err) {
      console.error("[Paymob Intention] Failed to resolve shipping zone:", err);
      // Fall back to default values
    }
  }

  let deliveryFee = subtotal >= zoneFreeThreshold ? 0 : zoneDeliveryFee;
  if (promoFreeShipping) deliveryFee = 0;

  const giftWrappingFee = giftBox ? GIFT_WRAP_FEE_EGP : 0;

  const total = Math.max(0, subtotal - discountAmount + deliveryFee + giftWrappingFee);

  const paymentMethod = paymentMethodParam ?? "card";

  // For COD, skip Paymob configuration checks
  if (paymentMethod !== "cash_on_delivery") {
    const paymobConfig = getPaymobConfigStatus();
    const integrationId = resolvePaymobIntegrationId(paymentMethod);
    const hasPaymobOnline = hasPaymobOnlineCheckout(paymentMethod);

    // PAY-05: Validate environment consistency
    const envError = validatePaymobEnvConsistency();
    if (envError) {
      console.error("[Paymob Intention] Environment inconsistency:", envError);
      return Response.json(
        {
          ok: false,
          error: `Paymob configuration error: ${envError}`,
          error_ar: `خطأ في إعدادات Paymob: ${envError}`,
        },
        { status: 500 },
      );
    }

    if (!hasPaymobOnline) {
      const missing: string[] = [];
      if (!paymobConfig.secretKey) missing.push("PAYMOB_SECRET_KEY or PAYMOB_API_KEY");
      if (!paymobConfig.publicKey) missing.push("PAYMOB_PUBLIC_KEY");
      if (!paymobConfig.hmacSecret) missing.push("PAYMOB_HMAC_SECRET");
      if (paymentMethod === "card" && !paymobConfig.integrationCard) missing.push("PAYMOB_INTEGRATION_ID_CARD");
      if (paymentMethod === "wallet" && !paymobConfig.integrationWallet) missing.push("PAYMOB_INTEGRATION_ID_WALLET");
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
      
      // For unpaid orders, check if we can reuse the existing Paymob intention
      if (existing.payment_status === "unpaid" && existing.paymob_accept_order_id && paymentMethod !== "cash_on_delivery") {
        // Return the existing payment URL if it exists (would need to fetch from Paymob or store in DB)
        // For now, cancel the existing order and allow recreation
        console.log("[Paymob Intention] Unpaid order exists for idempotency key, cancelling and recreating:", existing.id);
        const { releaseStockForOrder } = await import("@/lib/db/orders");
        await releaseStockForOrder(existing.id).catch((err) => 
          console.error("[Paymob Intention] Failed to release stock for existing unpaid order:", existing.id, err)
        );
        
        const supabase = createSupabaseAdminClient();
        const { error: cancelError } = await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", existing.id);
        
        if (cancelError) {
          console.error("[Paymob Intention] Failed to cancel existing unpaid order:", existing.id, cancelError);
        }
      }
    }
  }

  const dbUserId = await resolveSupabaseUserId();

  // Resolve billing data — from provided shipping, user profile, or safe placeholders
  const billing = await resolveBillingData(shipping, dbUserId);

  const shippingAddress = Object.fromEntries(
    Object.entries({
      name: billing.name,
      phone: billing.phone,
      phone_secondary: billing.phone_secondary,
      address: billing.street,
      city: billing.city,
      governorate: billing.governorate,
      notes: billing.notes,
      email: billing.email,
      delivery_date: billing.delivery_date,
      delivery_time: billing.delivery_time,
      latitude: billing.latitude,
      longitude: billing.longitude,
      place_label: billing.place_label,
    }).filter(([_, value]) => value !== undefined && value !== null && value !== "")
  );

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
    ...(verifiedGiftBox
      ? [
          {
            slug: "gift-box:custom",
            name: "Custom Gift Box",
            unitPrice: verifiedGiftBox.totalPrice,
            quantity: 1,
            skipProductLookup: true,
            productSnapshot: { type: "gift_box", snapshot: verifiedGiftBox },
            finalUnitPrice: verifiedGiftBox.totalPrice,
            selectedAddons: [],
            addonsTotalUnitPrice: 0,
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
      selectedAddons: [],
      addonsTotalUnitPrice: 0,
    })),
  ];

  const paymobProductLines = [
    ...resolved.map((line) => ({
      id: line.id,
      name: line.name,
      unitPrice: line.finalUnitPrice,
      quantity: line.quantity,
    })),
    ...(verifiedGiftBox
      ? [
          {
            id: "gift-box",
            name: "Custom Gift Box",
            unitPrice: verifiedGiftBox.totalPrice,
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
  const itemsSum = paymobItems.reduce((s, i) => s + i.amount * i.quantity, 0);
  
  // SEC-06: Removed debug console.log with PII/payload details
  
  if (itemsSum !== amountCents) {
    console.error("Paymob intention items sum mismatch", { itemsSum, amountCents, paymobItems });
    return Response.json({ ok: false, error: "Amount mismatch" }, { status: 500 });
  }

  try {
    const inserted = await insertCheckoutOrderTransactional({
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
      notes: billing.notes && billing.notes.trim() ? billing.notes : (paymentMethod === "cash_on_delivery" ? "Cash on delivery" : "Paymob checkout"),
      guestEmail: billing.rawEmail ?? null,
      giftWrappingFeeEgp: giftWrappingFee,
      orderType: giftBox ? "gift_box" : "standard",
      giftBoxSnapshot: verifiedGiftBox ?? null,
      checkoutIdempotencyKey: idempotencyKey ?? null,
    });

    const specialReference = String(inserted.orderNumber);

    // COD: Return order confirmation without Paymob intention
    if (paymentMethod === "cash_on_delivery") {
      try {
        // Trigger order creation email for COD
        if (billing.rawEmail) {
          await onOrderCreated({
            email: billing.rawEmail,
            userId: dbUserId,
            orderId: inserted.id,
            orderItems: resolved.map((line) => line.name).join(", "),
            totalPrice: total.toFixed(2),
          });
        }

        // Mark abandoned cart as recovered
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
          console.error("[COD Checkout] Abandoned cart recovery cleanup failed (non-fatal):", recoveryErr);
        }

        return Response.json({
          ok: true,
          configured: false,
          paymentMethod: "cash_on_delivery",
          orderId: specialReference,
          orderCode: inserted.orderCode,
          redirectUrl: `/checkout/thank-you?order=${inserted.orderCode}&status=success&payment_method=cash_on_delivery`,
          subtotalEgp: subtotal,
          deliveryFeeEgp: deliveryFee,
          discountAmountEgp: discountAmount,
          promoCode: appliedPromoCode,
          promoId: appliedPromoId,
          totalEgp: total,
          lines: resolved,
        });
      } catch (codErr) {
        console.error("[COD Checkout] Error:", codErr);
        return Response.json(
          {
            ok: false,
            error: "Something went wrong while processing your COD order — please try again.",
            error_ar: "حدث خطأ أثناء معالجة طلب الدفع عند الاستلام — يرجى المحاولة مرة أخرى.",
            error_type: "cod_processing",
          },
          { status: 500 },
        );
      }
    }
    
    // Paymob flow: Create intention and return hosted checkout URL
    const integrationId = resolvePaymobIntegrationId(paymentMethod);
    if (!integrationId) {
      return Response.json({ ok: false, error: "Invalid Paymob integration" }, { status: 400 });
    }
    
    const paymobBilling = buildPaymobIntentionBillingData({
      name: billing.name,
      email: billing.email || "guest@cookiebite.local",
      phone: billing.phone,
      street: billing.street,
      city: billing.city,
    });

    let intention;
    try {
      intention = await createPaymobIntention({
        amountCents,
        integrationId,
        items: paymobItems,
        billingData: paymobBilling,
        specialReference,
        extras: { order_id: inserted.id },
      });
    } catch (intentionErr) {
      console.error("[Paymob Intention] Failed to create payment intention, marking order as gateway_init_failed:", inserted.id, intentionErr);
      
      // Mark order as gateway_init_failed to prevent orphaned unpaid orders
      await markOrderGatewayInitFailed(inserted.id);
      
      // Release stock for the failed order
      const { releaseStockForOrder } = await import("@/lib/db/orders");
      await releaseStockForOrder(inserted.id).catch((relErr) =>
        console.error("[Paymob Intention] Stock release failed for failed order:", inserted.id, relErr)
      );
      
      // Return a specific error response
      return Response.json(
        {
          ok: false,
          error: "Payment gateway initialization failed. Please try again or contact support.",
          error_ar: "فشل تهيئة بوابة الدفع. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.",
          error_type: "payment_gateway_init_failed",
        },
        { status: 502 }
      );
    }

    await updatePaymobAcceptOrderId(inserted.id, intention.intentionOrderId);
    // SEC-06: Removed debug console.log with Paymob order ID

    // PAY-04: Removed pre-payment scheduleOrderConfirmed
    // Order confirmation should only happen on webhook payment success, not when creating the intention

    try {
      // SEC-06: Removed debug console.log
      await markAbandonedCartRecovered({
        userId: dbUserId,
        email: billing.rawEmail ?? null,
      });
      if (isRecoveryPromo && appliedPromoCode) {
        // SEC-06: Removed debug console.log with promo code
        const supabase = createSupabaseAdminClient();
        await markRecoveryDiscountUsed(supabase, appliedPromoCode);
      }
    } catch (recoveryErr) {
      console.error("[Paymob Checkout] Abandoned cart recovery cleanup failed (non-fatal):", recoveryErr);
    }

    if (billing.rawEmail) {
      try {
        // SEC-06: Removed debug console.log with email
        await onOrderCreated({
          email: billing.rawEmail,
          userId: dbUserId,
          orderId: inserted.id,
          orderItems: resolved.map((line) => line.name).join(", "),
          totalPrice: total.toFixed(2),
        });
      } catch (eventError) {
        console.error("[Paymob Checkout] Order created email trigger failed (non-fatal):", eventError);
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
    // Full details go to server-side structured logs only — never to the client.
    logStructuredError("checkout.paymob.intention", err);

    // Handle order creation errors specifically
    if (err instanceof Error && err.message.includes("Failed to insert")) {
      return Response.json(
        {
          ok: false,
          error: "We couldn't save your order — please try again or contact support.",
          error_ar: "فشل حفظ الطلب — يرجى المحاولة مرة أخرى أو التواصل مع الدعم.",
          error_type: "order_creation",
        },
        { status: 500 },
      );
    }

    if (err instanceof Error && err.message.includes("Missing Supabase")) {
      return Response.json(
        {
          ok: false,
          error: "Service temporarily unavailable — please try again later.",
          error_ar: "خطأ في إعدادات النظام — يرجى المحاولة لاحقاً.",
          error_type: "configuration",
        },
        { status: 500 },
      );
    }

    // Handle Paymob API errors
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
          error: "Payment could not be started — please try again.",
          error_ar: "فشل إنشاء الدفع — يرجى المحاولة مرة أخرى.",
          paymob_status: err.status,
          error_type: "payment_gateway",
        },
        { status },
      );
    }

    // Generic error — never leak internals (stack traces, DB errors) to the client.
    console.error("[Paymob Checkout] Error:", err);
    return Response.json(
      {
        ok: false,
        error: "Something went wrong while processing your order — please try again.",
        error_ar: "حدث خطأ أثناء معالجة الطلب — يرجى المحاولة مرة أخرى.",
        error_type: "unknown",
        ...(process.env.NODE_ENV !== "production"
          ? {
              details:
                err instanceof Error
                  ? { name: err.name, message: err.message, stack: err.stack }
                  : err,
            }
          : {}),
      },
      { status: 500 },
    );
  }
}
