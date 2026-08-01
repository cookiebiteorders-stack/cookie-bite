"use client";

import { useEffect, useState } from "react";
import { ShoppingBag, Zap } from "lucide-react";
import type { Product } from "@/lib/data";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  purchaseVisible: boolean;
  onAddClick: () => void;
  onBuyNowClick: () => void;
  disabled?: boolean;
  unitPriceLabel: string;
};

export function PdpStickyBar({
  product,
  purchaseVisible,
  onAddClick,
  onBuyNowClick,
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
      <div className="mx-auto flex max-w-lg flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-cb-text-strong">{product.name}</p>
            <ProductPriceDisplay
              price={product.price}
              comparePrice={product.comparePrice}
              size="sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={onAddClick}
            className={buttonClassName(
              "outline",
              "flex-1 inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold",
            )}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            ADD TO CART
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onBuyNowClick}
            className={buttonClassName(
              "primary",
              "flex-1 inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold bg-cb-terracotta-dark hover:bg-cb-terracotta-dark/90",
            )}
          >
            <Zap className="h-4 w-4" aria-hidden />
            BUY NOW
          </button>
        </div>
      </div>
    </div>
  );
}
