"use client";

import { Lock, RotateCcw, Truck } from "lucide-react";
import { PdpPaymentMethods } from "@/components/shop/pdp-payment-methods";
import { useLanguage } from "@/components/providers/language-provider";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import { BRAND } from "@/lib/brand";

export function PdpTrustStrip() {
  const { t } = useLanguage();
  const freeShippingThreshold = useFreeShippingThreshold();

  const items = [
    {
      icon: Truck,
      text: t("product.trustFreeDelivery", {
        amount: freeShippingThreshold,
        currency: BRAND.currency,
      }),
    },
    { icon: Lock, text: t("product.trustSecureCheckout") },
    { icon: RotateCcw, text: t("product.trustEasyReturns") },
  ];

  return (
    <div className="mt-6">
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map(({ icon: Icon, text }) => (
          <li
            key={text}
            className="flex items-center gap-2.5 rounded-2xl border border-cb-border/70 bg-cb-surface/80 px-3 py-2.5 text-sm font-medium text-cb-text"
          >
            <Icon className="h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <PdpPaymentMethods />
    </div>
  );
}
