"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";
import { useCart } from "@/components/providers/cart-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  product: Product;
};

export function PdpActions({ product }: Props) {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const outOfStock = product.stock != null && product.stock <= 0;
  const maxQty =
    product.stock != null && product.stock > 0
      ? Math.min(99, product.stock)
      : 99;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 rounded-full border-2 border-cb-border bg-cb-surface px-2 py-2 opacity-100">
        <button
          type="button"
          className="rounded-full p-2 text-cb-text hover:bg-cb-peach disabled:opacity-40"
          aria-label="Decrease quantity"
          disabled={outOfStock}
          onClick={() => setQty((q) => Math.max(1, q - 1))}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[2rem] text-center text-sm font-bold text-cb-text-strong">
          {qty}
        </span>
        <button
          type="button"
          className="rounded-full p-2 text-cb-text hover:bg-cb-peach disabled:opacity-40"
          aria-label="Increase quantity"
          disabled={outOfStock}
          onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        disabled={outOfStock}
        className={cn(
          buttonClassName("primary", "flex-1 gap-2 sm:max-w-xs"),
          "min-h-12 disabled:cursor-not-allowed disabled:opacity-50",
        )}
        onClick={() => {
          if (outOfStock) return;
          addItem(product, qty);
          setQty(1);
        }}
      >
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {outOfStock
          ? "Out of stock"
          : `Add to cart — ${(product.price * qty).toFixed(0)} EGP`}
      </button>
    </div>
  );
}
