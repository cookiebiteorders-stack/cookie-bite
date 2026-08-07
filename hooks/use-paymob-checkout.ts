"use client";

import { useCallback, useState } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { stashPendingPurchaseEvents } from "@/components/checkout/purchase-events-tracker";
import {
  buildSnapshotFromCartLine,
  type GiftBoxCartBuilderPayload,
} from "@/lib/gift-box/order-snapshot";
import { buildBundleOfferSnapshotFromCartLine } from "@/lib/offers/order-snapshot";
import type { CartLine } from "@/lib/cart/types";

import { trackBeginCheckout } from "@/lib/analytics/ga4";

export type PaymobCheckoutStatus = "idle" | "loading" | "error";

export type CheckoutDetails = {
  name: string;
  phonePrimary: string;
  phoneSecondary?: string;
  address: string;
  city: string;
  governorate?: string;
  notes?: string;
  deliveryDate: string;
  deliveryTime?: string;
  latitude?: number | null;
  longitude?: number | null;
  placeLabel?: string | null;
};

function buildPaymobIntentionBody(
  lines: CartLine[],
  promoCode?: string,
  checkoutDetails?: CheckoutDetails,
  paymentMethod?: "card" | "wallet" | "cash_on_delivery",
) {
  const giftBoxLine = lines.find((l) => Boolean(l.giftBox));
  const bundleOfferLines = lines.filter((l) => Boolean(l.bundleOffer));
  const regularLines = lines.filter((l) => !l.giftBox && !l.bundleOffer);

  const giftBoxSnapshot = giftBoxLine
    ? buildSnapshotFromCartLine(
        giftBoxLine,
        giftBoxLine.giftBox?.builder as GiftBoxCartBuilderPayload | undefined,
      )
    : null;

  const bundleOfferSnapshots = bundleOfferLines
    .map((line) => buildBundleOfferSnapshotFromCartLine(line))
    .filter(Boolean);

  return {
    giftBoxSnapshot,
    bundleOfferSnapshots,
    body: {
      items: regularLines.map((l) => ({
        id: l.productId,
        quantity: l.quantity,
        ...(l.variantId ? { variant_id: l.variantId } : {}),
        addons: l.addons,
      })),
      ...(giftBoxSnapshot ? { gift_box: giftBoxSnapshot } : {}),
      ...(bundleOfferSnapshots.length ? { bundle_offers: bundleOfferSnapshots } : {}),
      promo_code: promoCode,
      ...(paymentMethod ? { payment_method: paymentMethod } : {}),
      ...(checkoutDetails ? {
        shipping: Object.fromEntries(
          Object.entries({
            name: checkoutDetails.name,
            phone: checkoutDetails.phonePrimary,
            phone_secondary: checkoutDetails.phoneSecondary,
            address: checkoutDetails.address,
            city: checkoutDetails.city,
            governorate: checkoutDetails.governorate,
            notes: checkoutDetails.notes,
            delivery_date: checkoutDetails.deliveryDate,
            delivery_time: checkoutDetails.deliveryTime,
            latitude: checkoutDetails.latitude,
            longitude: checkoutDetails.longitude,
            place_label: checkoutDetails.placeLabel,
          }).filter(([_, value]) => value !== undefined && value !== null)
        ),
      } : {}),
    },
  };
}

/**
 * Cart → create order → Paymob intention → redirect to hosted checkout.
 */
export function usePaymobCheckout() {
  const { t } = useLanguage();
  const { lines, itemCount, promo, subtotalEgp, discountEgp, checkoutIdempotencyKey } = useCart();
  const [status, setStatus] = useState<PaymobCheckoutStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (checkoutDetails?: CheckoutDetails, paymentMethod?: "card" | "wallet" | "cash_on_delivery", csrfToken?: string | null) => {
    if (itemCount === 0 || status === "loading") return false;

    const { giftBoxSnapshot, body } = buildPaymobIntentionBody(lines, promo?.code, checkoutDetails, paymentMethod);

    if (lines.some((l) => l.giftBox) && !giftBoxSnapshot) {
      setError(t("pages.checkout.errGiftBox"));
      setStatus("error");
      return false;
    }

    trackBeginCheckout(
      lines.map(l => ({
        item_id: l.productId,
        item_name: l.name,
        price: l.finalUnitPriceEgp,
        quantity: l.quantity,
      })),
      subtotalEgp - discountEgp
    );

    setStatus("loading");
    setError(null);

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("Sending checkout request:", JSON.stringify(body, null, 2));
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      const res = await fetch("/api/checkout/paymob/intention", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...body,
          idempotency_key: checkoutIdempotencyKey,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        configured?: boolean;
        paymentUrl?: string;
        paymentMethod?: string;
        redirectUrl?: string;
        orderCode?: string;
      };

      if (process.env.NODE_ENV !== "production") {
        console.log("Checkout response:", JSON.stringify(data, null, 2));
      }

      if (!res.ok || !data.ok) {
        setError(
          (typeof data.error === "string" && data.error) || t("pages.checkout.errPayment"),
        );
        setStatus("error");
        return false;
      }

      // Handle COD response - redirect to order confirmation
      if (data.paymentMethod === "cash_on_delivery" && data.redirectUrl) {
        stashPendingPurchaseEvents(
          lines
            .filter((l) => l.productUuid)
            .map((l) => ({ product_id: l.productUuid!, quantity: l.quantity })),
        );
        window.location.href = data.redirectUrl;
        return true;
      }

      // Handle Paymob response - redirect to hosted checkout
      if (data.configured && data.paymentUrl) {
        stashPendingPurchaseEvents(
          lines
            .filter((l) => l.productUuid)
            .map((l) => ({ product_id: l.productUuid!, quantity: l.quantity })),
        );
        window.location.href = data.paymentUrl;
        return true;
      }

      setError(typeof data.message === "string" ? data.message : t("pages.checkout.errPaymob"));
      setStatus("error");
      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("pages.checkout.errNetwork");
      console.error("Checkout error:", err);
      setError(errorMessage);
      setStatus("error");
      return false;
    }
  }, [itemCount, lines, promo?.code, status, t, checkoutIdempotencyKey]);

  return { startCheckout, status, error, isLoading: status === "loading" };
}
