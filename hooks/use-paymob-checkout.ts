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

function buildPaymobIntentionBody(lines: CartLine[], promoCode?: string) {
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

  const startCheckout = useCallback(async () => {
    if (itemCount === 0 || status === "loading") return false;

    const { giftBoxSnapshot, body } = buildPaymobIntentionBody(lines, promo?.code);

    if (lines.some((l) => l.giftBox) && !giftBoxSnapshot) {
      setError(t("pages.checkout.errGiftBox"));
      setStatus("error");
      return false;
    }

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/checkout/paymob/intention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        configured?: boolean;
        paymentUrl?: string;
      };

      if (!res.ok) {
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
