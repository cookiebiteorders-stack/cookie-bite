import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { insertCheckoutOrder } from "@/lib/db/orders";
import { getUserByClerkId } from "@/lib/db/users";
import { resolveCheckoutLineItems } from "@/lib/checkout/resolve-line-items";
import { scheduleOrderConfirmed } from "@/lib/notifications/schedule";
import {
  buildPaymobBillingData,
  buildPaymobLineItems,
  paymobAuthToken,
  paymobCreatePaymentKey,
  paymobIframeUrl,
  paymobRegisterEcommerceOrder,
} from "@/lib/paymob/accept";
import { resolvePaymobHmacSecret } from "@/lib/paymob/env";
import { siteConfig } from "@/lib/site-config";
import {
  fetchActivePromoByCode,
  validatePromoForCart,
} from "@/lib/promo/validate-promo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
    }),
  ),
  shipping: z.object({
    name: z.string().min(2),
    phone: z.string().regex(/^01[0125][0-9]{8}$/),
    address: z.string().min(5),
    city: z.string().min(2),
    notes: z.string().optional(),
    email: z.union([z.string().email(), z.literal("")]).optional(),
  }),
  paymentMethod: z.enum(["card", "wallet", "cod"]),
  promo_code: z.string().min(3).max(20).optional(),
});

async function resolveSupabaseUserId(): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const { userId } = await auth();
  if (!userId) return null;
  const row = await getUserByClerkId(userId);
  return row?.id ?? null;
}

/**
 * يعيد المجاميع من السيرفر فقط — لا تثق بأسعار العميل.
 * COD: حفظ في Supabase عند توفر المفاتيح + بريد تأكيد (اختياري).
 * Card/Wallet: Accept API + حفظ الطلب مع paymob_accept_order_id.
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

  const { items, shipping, paymentMethod, promo_code: promoCodeRaw } = parsed.data;
  const shippingEmail =
    shipping.email && shipping.email.length > 0 ? shipping.email : undefined;

  const pricing = await resolveCheckoutLineItems(items);
  if (!pricing.ok) {
    return Response.json(
      { ok: false, error: pricing.error },
      { status: pricing.status },
    );
  }
  const { lines: resolved, subtotal } = pricing;

  const threshold = siteConfig.freeDeliveryThresholdEgp;
  const deliveryFee = subtotal >= threshold ? 0 : siteConfig.standardDeliveryFeeEgp;

  let discountAmount = 0;
  let appliedPromoCode: string | null = null;
  let appliedPromoId: string | null = null;

  if (promoCodeRaw?.trim()) {
    try {
      const supabase = createSupabaseAdminClient();
      const promo = await fetchActivePromoByCode(supabase, promoCodeRaw.trim());
      const validation = validatePromoForCart(promo, subtotal);
      if (validation.valid) {
        discountAmount = validation.discount_amount;
        appliedPromoCode = validation.promo.code;
        appliedPromoId = validation.promo.id;
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

  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  const apiKey = process.env.PAYMOB_API_KEY?.trim() ?? "";
  const hmacSecret = resolvePaymobHmacSecret();
  const integrationCard = Number(process.env.PAYMOB_INTEGRATION_ID_CARD);
  const integrationWallet = Number(process.env.PAYMOB_INTEGRATION_ID_WALLET);
  const hasPaymobAuth = Boolean(apiKey && hmacSecret);
  const integrationId =
    paymentMethod === "wallet" ? integrationWallet : integrationCard;
  const hasPaymobOnline =
    hasPaymobAuth && Number.isFinite(integrationId) && integrationId > 0;

  const guestRef = `CB-${Date.now().toString(36)}`.toUpperCase();
  const dbUserId = await resolveSupabaseUserId();
  const shippingAddress = {
    name: shipping.name,
    phone: shipping.phone,
    address: shipping.address,
    city: shipping.city,
    notes: shipping.notes ?? "",
    email: shippingEmail ?? "",
    guestRef,
  };

  if (paymentMethod === "cod") {
    const inserted = await insertCheckoutOrder({
      userId: dbUserId,
      lines: resolved.map((l) => ({
        slug: l.id,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
      subtotalEgp: subtotal,
      deliveryFeeEgp: deliveryFee,
      discountAmountEgp: discountAmount,
      promoCode: appliedPromoCode,
      promoId: appliedPromoId,
      totalEgp: total,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      shippingAddress,
      notes: `Web checkout · ${guestRef}`,
      guestEmail: shippingEmail ?? null,
    });

    const orderId = inserted ? String(inserted.orderNumber) : guestRef;

    if (inserted?.id) {
      scheduleOrderConfirmed(inserted.id);
    }

    return Response.json({
      ok: true,
      configured: false,
      paymentMethod: "cod",
      orderId,
      persisted: Boolean(inserted),
      subtotalEgp: subtotal,
      deliveryFeeEgp: deliveryFee,
      discountAmountEgp: discountAmount,
      promoCode: appliedPromoCode,
      promoId: appliedPromoId,
      totalEgp: total,
      lines: resolved,
      shipping: { ...shipping, email: shippingEmail ?? "" },
      message: inserted
        ? "Order saved. Pay cash on delivery."
        : "Order recorded in session only — set Supabase service key + run migration 0002 to persist.",
    });
  }

  if (!hasPaymobAuth) {
    return Response.json({
      ok: true,
      configured: false,
      paymentMethod,
      subtotalEgp: subtotal,
      deliveryFeeEgp: deliveryFee,
      discountAmountEgp: discountAmount,
      promoCode: appliedPromoCode,
      promoId: appliedPromoId,
      totalEgp: total,
      lines: resolved,
      shipping,
      message:
        "Paymob keys missing. Set PAYMOB_API_KEY and PAYMOB_HMAC_SECRET (or legacy PAYMOB_HMAC), plus PAYMOB_INTEGRATION_ID_CARD / WALLET.",
    });
  }

  if (!hasPaymobOnline) {
    return Response.json({
      ok: false,
      error:
        "Paymob integration ID missing for this payment method. Set PAYMOB_INTEGRATION_ID_CARD or PAYMOB_INTEGRATION_ID_WALLET in .env.",
    }, { status: 400 });
  }

  const amountCents = Math.round(total * 100);
  const paymobItems = buildPaymobLineItems(resolved, deliveryFee, discountAmount);
  const itemsSum = paymobItems.reduce((s, i) => s + i.amount_cents, 0);
  if (itemsSum !== amountCents) {
    console.error("Paymob line items sum mismatch", { itemsSum, amountCents });
    return Response.json({ ok: false, error: "Amount mismatch" }, { status: 500 });
  }

  try {
    const token = await paymobAuthToken(apiKey);
    const paymobOrderId = await paymobRegisterEcommerceOrder(token, amountCents, paymobItems);

    const inserted = await insertCheckoutOrder({
      userId: dbUserId,
      lines: resolved.map((l) => ({
        slug: l.id,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
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
      paymobAcceptOrderId: paymobOrderId,
      guestEmail: shippingEmail ?? null,
    });

    if (inserted?.id) {
      scheduleOrderConfirmed(inserted.id);
    }

    const billing = buildPaymobBillingData({
      name: shipping.name,
      email: shippingEmail ?? "",
      phone: shipping.phone,
      street: `${shipping.address}, ${shipping.city}`,
      city: shipping.city,
    });

    const paymentToken = await paymobCreatePaymentKey(
      token,
      amountCents,
      paymobOrderId,
      integrationId,
      billing,
    );

    const paymentUrl = paymobIframeUrl(paymentToken);

    return Response.json({
      ok: true,
      configured: true,
      paymentMethod,
      paymentUrl,
      orderId: inserted ? String(inserted.orderNumber) : guestRef,
      persisted: Boolean(inserted),
      paymobOrderId,
      subtotalEgp: subtotal,
      deliveryFeeEgp: deliveryFee,
      discountAmountEgp: discountAmount,
      promoCode: appliedPromoCode,
      promoId: appliedPromoId,
      totalEgp: total,
      lines: resolved,
      shipping: { ...shipping, email: shippingEmail ?? "" },
    });
  } catch (err) {
    console.error("Paymob checkout failed", err);
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Paymob request failed",
      },
      { status: 502 },
    );
  }
}
