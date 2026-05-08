"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/src/hooks/useCart";

export function CartBadge() {
  const { totalItems, openDrawer } = useCart();

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-cb-border bg-cb-surface text-cb-text-strong transition hover:bg-cb-surface-elevated"
      aria-label={`Open cart${totalItems ? ` with ${totalItems} items` : ""}`}
    >
      <ShoppingBag className="h-5 w-5" />
      {totalItems > 0 ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-cb-terracotta-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      ) : null}
    </button>
  );
}

