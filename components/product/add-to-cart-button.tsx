"use client";

import type { ReactNode } from "react";
import type { Product } from "@/lib/data";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { isProductOutOfStock } from "@/lib/products/stock";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
  quantity?: number;
  className?: string;
  children?: ReactNode;
  variant?: "primary" | "outline";
};

export function AddToCartButton({
  product,
  quantity = 1,
  className,
  children,
  variant = "primary",
}: Props) {
  const { addItem } = useCart();
  const { t } = useLanguage();
  const outOfStock = isProductOutOfStock(product.stock);

  if (outOfStock) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-cb-border bg-cb-surface-2 px-4 py-2 text-sm font-bold text-cb-text-muted",
          className,
        )}
      >
        {t("product.outOfStock")}
      </span>
    );
  }

  return (
    <Button
      type="button"
      variant={variant === "outline" ? "outline" : "primary"}
      className={cn("inline-flex items-center justify-center gap-2", className)}
      onClick={() => {
        addItem(product, quantity);
        if (product.productUuid) {
          trackProductEvent({
            product_id: product.productUuid,
            event_type: "add_to_cart",
            metadata: { quantity, slug: product.id },
          });
        } else {
          trackProductEvent({
            product_slug: product.id,
            event_type: "add_to_cart",
            metadata: { quantity },
          });
        }
      }}
    >
      {children ?? t("product.addToCart")}
    </Button>
  );
}
