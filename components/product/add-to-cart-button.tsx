"use client";

import type { ReactNode } from "react";
import type { Product } from "@/lib/data";
import { useCart } from "@/components/providers/cart-provider";
import { Button } from "@/components/ui/button";
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

  return (
    <Button
      type="button"
      variant={variant === "outline" ? "outline" : "primary"}
      className={cn("inline-flex items-center justify-center gap-2", className)}
      onClick={() => addItem(product, quantity)}
    >
      {children ?? "Add to cart"}
    </Button>
  );
}
