"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/src/types/cart";

interface CartStore {
  items: CartItem[];
  isDrawerOpen: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      addItem: (item) => {
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) }
                : i,
            ),
          });
          return;
        }
        set({ items: [...get().items, { ...item, quantity: 1 }] });
      },
      removeItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      updateQuantity: (id, quantity) =>
        set({
          items: get()
            .items.map((i) =>
              i.id === id
                ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        }),
      clearCart: () => set({ items: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
    }),
    { name: "cookie-bite-cart-v1" },
  ),
);

export const cartSelectors = {
  totalItems: (items: CartItem[]) => items.reduce((a, i) => a + i.quantity, 0),
  subtotal: (items: CartItem[]) => items.reduce((a, i) => a + i.price * i.quantity, 0),
  savings: (items: CartItem[]) =>
    items.reduce(
      (a, i) => a + ((i.originalPrice ?? i.price) - i.price) * i.quantity,
      0,
    ),
};

