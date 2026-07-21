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
      ...(checkoutDetails ? {
        shipping: {
          name: checkoutDetails.name,
          phone: checkoutDetails.phonePrimary,
          phone_secondary: checkoutDetails.phoneSecondary || undefined,
          address: checkoutDetails.address,
          city: checkoutDetails.city,
          governorate: checkoutDetails.governorate || undefined,
          notes: checkoutDetails.notes || undefined,
          delivery_date: checkoutDetails.deliveryDate || undefined,
          delivery_time: checkoutDetails.deliveryTime || undefined,
          latitude: checkoutDetails.latitude || undefined,
          longitude: checkoutDetails.longitude || undefined,
          place_label: checkoutDetails.placeLabel || undefined,
        },
      } : {}),
    },
  };
}

/**
 * Cart → create order → Paymob intention → redirect to hosted checkout.
 */
export function usePaymobCheckout() {
  const { t } = useLanguage();
  const { lines, itemCount, promo } = useCart();
  const [status, setStatus] = useState<PaymobCheckoutStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (checkoutDetails?: CheckoutDetails) => {
    if (itemCount === 0 || status === "loading") return false;

    const { giftBoxSnapshot, body } = buildPaymobIntentionBody(lines, promo?.code, checkoutDetails);

    if (lines.some((l) => l.giftBox) && !giftBoxSnapshot) {
      setError(t("pages.checkout.errGiftBox"));
      setStatus("error");
      return false;
    }

    setStatus("loading");
    setError(null);

    try {
      console.log("Sending checkout request:", JSON.stringify(body, null, 2));
      const res = await fetch("/api/checkout/paymob/intention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        configured?: boolean;
        paymentUrl?: string;
      };

      console.log("Checkout response:", JSON.stringify(data, null, 2));

      if (!res.ok || !data.ok) {
        setError(
          (typeof data.error === "string" && data.error) || t("pages.checkout.errPayment"),
        );
        setStatus("error");
        return false;
      }

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
    } catch {
      setError(t("pages.checkout.errNetwork"));
      setStatus("error");
      return false;
    }
  }, [itemCount, lines, promo?.code, status, t]);

  return { startCheckout, status, error, isLoading: status === "loading" };
}
