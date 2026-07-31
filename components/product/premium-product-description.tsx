"use client";

import { Check } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  productName: string;
  baseDescription?: string | null;
  features?: string[];
  className?: string;
};

const DEFAULT_FEATURES = [
  "Freshly baked",
  "Belgian chocolate",
  "Premium ingredients",
  "Same-day delivery available",
  "Multiple payment methods",
];

export function PremiumProductDescription({
  productName,
  baseDescription,
  features = DEFAULT_FEATURES,
  className,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Premium marketing copy */}
      <div className="space-y-3">
        <h3 className="font-serif text-lg font-semibold text-cb-text-strong">
          {t("product.premiumTitle", { name: productName })}
        </h3>
        <p className="text-base leading-relaxed text-cb-text-muted">
          {baseDescription || t("product.defaultPremiumDescription")}
        </p>
      </div>

      {/* Feature highlights */}
      <div className="rounded-2xl border border-cb-border bg-cb-surface p-5">
        <h4 className="mb-4 font-semibold text-cb-text-strong">
          {t("product.whyChooseUs")}
        </h4>
        <ul className="space-y-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 text-sm text-cb-text-strong"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
