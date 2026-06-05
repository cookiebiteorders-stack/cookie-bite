"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  purchaseVisible: boolean;
  onAddClick: () => void;
  disabled?: boolean;
  unitPriceLabel: string;
};

export function PdpStickyBar({
  product,
  purchaseVisible,
  onAddClick,
  disabled,
  unitPriceLabel,
}: Props) {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!purchaseVisible);
  }, [purchaseVisible]);

  if (!show || disabled) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-cb-border bg-cb-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden",
      )}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      role="region"
      aria-label={t("product.stickyBarAria")}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cb-text-strong">{product.name}</p>
          <ProductPriceDisplay
            price={product.price}
            comparePrice={product.comparePrice}
            size="sm"
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onAddClick}
          className={buttonClassName(
            "primary",
            "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-bold",
          )}
        >
          <ShoppingBag className="h-4 w-4" aria-hidden />
          {unitPriceLabel}
        </button>
      </div>
    </div>
  );
}
