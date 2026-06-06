"use client";

import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

const METHODS = [
  { id: "card", icon: CreditCard, labelKey: "product.trustPayCard" as const },
  { id: "wallet", icon: Smartphone, labelKey: "product.trustPayWallet" as const },
  { id: "cod", icon: Banknote, labelKey: "product.trustPayCod" as const },
] as const;

export function PdpPaymentMethods() {
  const { t } = useLanguage();

  return (
    <div className="mt-4 rounded-2xl border border-cb-border/70 bg-cb-surface/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
        {t("product.trustPaymentMethods")}
      </p>
      <ul className="mt-2.5 flex flex-wrap items-center gap-2" aria-label={t("product.trustPaymentMethods")}>
        {METHODS.map(({ id, icon: Icon, labelKey }) => (
          <li
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full border border-cb-border/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-cb-text-strong"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-cb-terracotta-dark" aria-hidden />
            <span>{t(labelKey)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
