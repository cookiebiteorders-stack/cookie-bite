"use client";

import { Check } from "lucide-react";
import type { ProductVariant } from "@/lib/data";
import { useLanguage } from "@/components/providers/language-provider";
import { isProductOutOfStock } from "@/lib/products/stock";
import { cn } from "@/lib/utils";

type Props = {
  variants: ProductVariant[];
  selectedId: string | null;
  onSelect: (variantId: string) => void;
  className?: string;
};

export function ProductVariantPicker({
  variants,
  selectedId,
  onSelect,
  className,
}: Props) {
  const { t, formatPrice } = useLanguage();

  if (variants.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-bold text-cb-text-strong">{t("product.chooseSize")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variants.map((variant) => {
          const active = variant.id === selectedId;
          const soldOut = isProductOutOfStock(variant.stock);
          const meta: string[] = [];
          if (variant.size?.trim()) meta.push(variant.size.trim());
          if (variant.weightGrams && variant.weightGrams > 0) {
            meta.push(t("product.pdpWeightValue", { grams: variant.weightGrams }));
          }
          if (variant.piecesCount && variant.piecesCount > 0) {
            meta.push(t("product.variantPieces", { count: variant.piecesCount }));
          }
          return (
            <button
              key={variant.id}
              type="button"
              disabled={soldOut}
              aria-pressed={active}
              onClick={() => onSelect(variant.id)}
              className={cn(
                "relative flex flex-col gap-1 rounded-2xl border-2 p-3 text-start transition",
                active
                  ? "border-cb-terracotta-dark bg-cb-peach/30 shadow-sm"
                  : "border-cb-border bg-cb-surface hover:border-cb-terracotta-dark/40",
                soldOut && "cursor-not-allowed opacity-50",
              )}
            >
              {active ? (
                <span className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-cb-terracotta-dark text-white">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}
              <span className="text-sm font-bold text-cb-text-strong">{variant.name}</span>
              {meta.length > 0 ? (
                <span className="text-[11px] font-medium text-cb-text-muted">
                  {meta.join(" · ")}
                </span>
              ) : null}
              <span className="text-sm font-bold text-cb-terracotta-dark">
                {formatPrice(variant.price)}
              </span>
              {soldOut ? (
                <span className="text-[10px] font-bold text-cb-text-muted">
                  {t("product.outOfStock")}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
