"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/data";
import {
  cartItemCount,
  cartSubtotal,
  lineFromProduct,
  type CartLine,
} from "@/lib/cart/types";

const STORAGE_KEY = "cb-cart-v1";

type CartContextValue = {
  lines: CartLine[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalEgp: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CartLine =>
        typeof x === "object" &&
        x !== null &&
        "productId" in x &&
        "quantity" in x &&
        typeof (x as CartLine).productId === "string" &&
        typeof (x as CartLine).quantity === "number",
    );
  } catch {
    return [];
  }
}

function tryMigrateLegacyZustandCart(): CartLine[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("cookie-bite-cart-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: {
        items?: Array<{
          id: string;
          name: string;
          price: number;
          image: string;
          quantity: number;
        }>;
      };
    };
    const items = parsed?.state?.items;
    if (!Array.isArray(items) || items.length === 0) return null;
    return items.map((i) => ({
      productId: i.id,
      name: i.name,
      priceEgp: i.price,
      image: i.image,
      quantity: Math.min(99, Math.max(1, Number(i.quantity) || 1)),
    }));
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      let initial = loadLines();
      if (initial.length === 0) {
        const migrated = tryMigrateLegacyZustandCart();
        if (migrated?.length) {
          initial = migrated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        }
      }
      setLines(initial);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx === -1) {
        return [...prev, lineFromProduct(product, quantity)];
      }
      const next = [...prev];
      const q = Math.min(99, next[idx].quantity + quantity);
      next[idx] = { ...next[idx], quantity: q };
      return next;
    });
    setDrawerOpen(true);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const q = Math.min(99, Math.max(0, quantity));
    setLines((prev) => {
      if (q === 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) =>
        l.productId === productId ? { ...l, quantity: q } : l,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const itemCount = useMemo(() => cartItemCount(lines), [lines]);
  const subtotalEgp = useMemo(() => cartSubtotal(lines), [lines]);

  const value = useMemo(
    () => ({
      lines,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotalEgp,
    }),
    [
      lines,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotalEgp,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
