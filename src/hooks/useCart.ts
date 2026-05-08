"use client";

import { cartSelectors, useCartStore } from "@/src/store/cartStore";

export function useCart() {
  const items = useCartStore((s) => s.items);
  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  return {
    items,
    isDrawerOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    openDrawer,
    closeDrawer,
    totalItems: cartSelectors.totalItems(items),
    subtotal: cartSelectors.subtotal(items),
    savings: cartSelectors.savings(items),
  };
}

