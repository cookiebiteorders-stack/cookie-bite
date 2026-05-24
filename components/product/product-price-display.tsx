"use client";

import { useLanguage } from "@/components/providers/language-provider";
import {
  formatProductPriceEgp,
  getProductDiscount,
} from "@/lib/products/pricing";
import { cn } from "@/lib/utils";

type Props = {
  price: number;
  comparePrice?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeStyles = {
  sm: {
    sale: "text-base font-bold",
    compare: "text-sm",
    meta: "text-[11px]",
    badge: "text-[10px] px-1.5 py-0.5",
  },
  md: {
    sale: "text-lg font-bold",
    compare: "text-sm",
    meta: "text-xs",
    badge: "text-[11px] px-2 py-0.5",
  },
  lg: {
    sale: "font-serif text-3xl font-bold",
    compare: "text-lg",
    meta: "text-sm",
    badge: "text-xs px-2.5 py-1",
  },
} as const;

export function ProductPriceDisplay({
  price,
  comparePrice,
  size = "md",
  className,
}: Props) {
  const { lang, t } = useLanguage();
  const locale = lang === "ar" ? "ar-EG" : "en-EG";
  const discount = getProductDiscount(price, comparePrice);
  const styles = sizeStyles[size];

  if (!discount) {
    return (
      <p className={cn(styles.sale, "text-cb-terracotta-dark", className)}>
        {formatProductPriceEgp(price, locale)}
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            styles.compare,
            "font-medium text-cb-text-muted line-through decoration-cb-text-muted/70",
          )}
        >
          {formatProductPriceEgp(discount.comparePrice, locale)}
        </span>
        <span className={cn(styles.sale, "text-cb-terracotta-dark")}>
          {formatProductPriceEgp(discount.salePrice, locale)}
        </span>
        <span
          className={cn(
            styles.badge,
            "rounded-full bg-cb-terracotta-dark font-bold text-white",
          )}
        >
          {t("product.discountPercent", { percent: discount.percent })}
        </span>
      </div>
      <p className={cn(styles.meta, "font-semibold text-emerald-700 dark:text-emerald-400")}>
        {t("product.saveAmount", { amount: discount.amountEgp.toLocaleString(locale) })}
      </p>
    </div>
  );
}
