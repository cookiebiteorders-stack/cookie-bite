"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product, ProductVariant } from "@/lib/data";
import { dedupeCartSelectedAddons } from "@/lib/addons/dedupe";
import type { CartSelectedAddon } from "@/lib/addons/types";
import {
  cartItemCount,
  cartSubtotal,
  buildCartLineId,
  bundleOfferLine,
  giftBoxLine,
  lineFromProduct,
  type CartLine,
} from "@/lib/cart/types";
import type { StorefrontBundleOffer } from "@/lib/offers/storefront";
import { persistGiftBoxState } from "@/lib/gift-box-builder/state";
import { builderStateFromSnapshot, type GiftBoxOrderSnapshot } from "@/lib/gift-box/order-snapshot";

import dynamic from "next/dynamic";

const AbandonedCartTracker = dynamic(
  () =>
    import("@/components/cart/abandoned-cart-tracker").then((m) => m.AbandonedCartTracker),
  { ssr: false },
);
import type { AppliedPromo } from "@/components/checkout/promo-code-field";

const STORAGE_KEY = "cb-cart-v1";
const PROMO_STORAGE_KEY = "cb-promo-v1";
const IDEMPOTENCY_KEY_STORAGE_KEY = "cb-idempotency-v1";

type CartContextValue = {
  lines: CartLine[];
  isDrawerOpen: boolean;
  /** Slug of the last standard product added — powers drawer upsell. */
  lastUpsellSourceProductId: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  addItem: (
    product: Product,
    quantity?: number,
    addons?: CartSelectedAddon[],
    addonsTotalEgp?: number,
    variant?: ProductVariant | null,
  ) => void;
  addGiftBoxItem: (input: {
    id: string;
    name: string;
    image: string;
    boxSize: string;
    selectedProducts: {
      product_id: string;
      quantity: number;
      price_snapshot: number;
      name?: string;
      image?: string;
    }[];
    message?: string | null;
    totalPrice: number;
    builder?: Record<string, unknown>;
  }) => void;
  addBundleOfferItem: (offer: StorefrontBundleOffer) => void;
  restoreGiftBox: (snapshot: GiftBoxOrderSnapshot) => void;
  restoreCart: (lines: CartLine[], discountCode?: string | null) => Promise<void>;
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotalEgp: number;
  promo: AppliedPromo | null;
  discountEgp: number;
  applyPromo: (promo: AppliedPromo) => void;
  clearPromo: () => void;
  /** Idempotency key for checkout - prevents duplicate orders on retry (ORD-01) */
  checkoutIdempotencyKey: string;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const list = parsed.filter(
      (x): x is Partial<CartLine> &
        Pick<CartLine, "productId" | "quantity" | "name" | "priceEgp" | "image"> =>
        typeof x === "object" &&
        x !== null &&
        "productId" in x &&
        "quantity" in x &&
        typeof (x as CartLine).productId === "string" &&
        typeof (x as CartLine).quantity === "number",
    );
    return list.map((line) => {
      const addons = dedupeCartSelectedAddons(Array.isArray(line.addons) ? line.addons : []);
      const addonsTotalEgp = Number(line.addonsTotalEgp ?? 0);
      return {
        id: line.id || buildCartLineId(line.productId, addons, line.variantId),
        productId: line.productId,
        productUuid: line.productUuid,
        name: line.name,
        priceEgp: Number(line.priceEgp ?? 0),
        image: line.image,
        quantity: line.quantity,
        addons,
        addonsTotalEgp,
        finalUnitPriceEgp: Number(line.finalUnitPriceEgp ?? Number(line.priceEgp ?? 0) + addonsTotalEgp),
        giftBox: line.giftBox,
        bundleOffer: line.bundleOffer,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        variantSnapshot: line.variantSnapshot,
      };
    });
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
      id: i.id,
      productId: i.id,
      name: i.name,
      priceEgp: i.price,
      image: i.image,
      quantity: Math.min(99, Math.max(1, Number(i.quantity) || 1)),
      addons: [],
      addonsTotalEgp: 0,
      finalUnitPriceEgp: i.price,
    }));
  } catch {
    return null;
  }
}

function loadPromo(): AppliedPromo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROMO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppliedPromo;
    if (!parsed?.code || typeof parsed.discount_amount !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [trackAbandon, setTrackAbandon] = useState(false);
  const [promo, setPromo] = useState<AppliedPromo | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [lastUpsellSourceProductId, setLastUpsellSourceProductId] = useState<string | null>(
    null,
  );
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>("");

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
      setPromo(loadPromo());
      
      // Load or generate idempotency key for checkout (ORD-01)
      let idemKey = "";
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(IDEMPOTENCY_KEY_STORAGE_KEY);
          if (stored) {
            idemKey = stored;
          } else {
            // Generate new UUID for idempotency
            idemKey = crypto.randomUUID();
            localStorage.setItem(IDEMPOTENCY_KEY_STORAGE_KEY, idemKey);
          }
        } catch {
          // Fallback if crypto.randomUUID not available
          idemKey = Date.now().toString(36) + Math.random().toString(36).substring(2);
        }
      }
      setCheckoutIdempotencyKey(idemKey);
      
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const enable = () => setTrackAbandon(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 12_000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (promo) {
      localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(promo));
    } else {
      localStorage.removeItem(PROMO_STORAGE_KEY);
    }
  }, [promo, hydrated]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setLastUpsellSourceProductId(null);
  }, []);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);

  const addItem = useCallback(
    (
      product: Product,
      quantity = 1,
      addons: CartSelectedAddon[] = [],
      addonsTotalEgp = 0,
      variant: ProductVariant | null = null,
    ) => {
    setLines((prev) => {
      const nextLine = lineFromProduct(product, quantity, addons, addonsTotalEgp, variant);
      const idx = prev.findIndex((l) => l.id === nextLine.id);
      if (idx === -1) {
        return [...prev, nextLine];
      }
      const next = [...prev];
      const q = Math.min(99, next[idx].quantity + quantity);
      next[idx] = { ...next[idx], quantity: q };
      return next;
    });
    setLastUpsellSourceProductId(product.id);
    setDrawerOpen(true);
    void import("@/lib/announcements/behavior").then((m) => m.markClientBehavior("add_to_cart"));
    void import("@/lib/announcements/events").then((m) =>
      m.dispatchAnnouncementTrigger("add_to_cart"),
    );
    },
    [],
  );

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    const q = Math.min(99, Math.max(0, quantity));
    setLines((prev) => {
      const target = prev.find((l) => l.id === lineId);
      if (target?.giftBox || target?.bundleOffer) return prev;
      if (q === 0) return prev.filter((l) => l.id !== lineId);
      return prev.map((l) =>
        l.id === lineId ? { ...l, quantity: q } : l,
      );
    });
  }, []);

  const addGiftBoxItem = useCallback(
    (input: {
      id: string;
      name: string;
      image: string;
      boxSize: string;
      selectedProducts: {
        product_id: string;
        quantity: number;
        price_snapshot: number;
        name?: string;
        image?: string;
      }[];
      message?: string | null;
      totalPrice: number;
      builder?: Record<string, unknown>;
    }) => {
      setLines((prev) => {
        const nextLine = giftBoxLine(input);
        return [...prev, nextLine];
      });
      setDrawerOpen(true);
    },
    [],
  );

  const addBundleOfferItem = useCallback((offer: StorefrontBundleOffer) => {
    setLines((prev) => {
      const existingIdx = prev.findIndex((l) => l.bundleOffer?.offer_id === offer.id);
      const nextLine = bundleOfferLine({
        offerId: offer.id,
        name: offer.name,
        nameEn: offer.name_en,
        nameAr: offer.name_ar,
        image: offer.products[0]?.image || "/images/web-logo.png",
        offerPriceEgp: offer.offer_price_egp,
        originalTotalEgp: offer.original_total_egp,
        savingsEgp: offer.savings_egp,
        products: offer.products.map((p) => ({
          product_id: p.id,
          slug: p.slug,
          name: p.name,
          price_snapshot: p.price_egp,
          image: p.image,
        })),
        addons: offer.addons.map((a) => ({
          addon_id: a.addon_id,
          option_id: a.option_id,
          name: a.name,
          price_snapshot: a.price,
        })),
      });
      if (existingIdx === -1) return [...prev, nextLine];
      const next = [...prev];
      next[existingIdx] = nextLine;
      return next;
    });
    setDrawerOpen(true);
  }, []);

  const restoreGiftBox = useCallback((snapshot: GiftBoxOrderSnapshot) => {
    const state = builderStateFromSnapshot(snapshot);
    persistGiftBoxState(state);
    setLines([]);
    setPromo(null);
  }, []);

  const restoreCart = useCallback(async (lines: CartLine[], discountCode?: string | null) => {
    setLines(lines);
    if (!discountCode) {
      setPromo(null);
      return;
    }
    const subtotal = cartSubtotal(lines);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode, cart_total: subtotal }),
      });
      const data = (await res.json()) as {
        valid?: boolean;
        discount_amount?: number;
        type?: "percent" | "fixed";
        value?: number;
        code?: string;
      };
      if (data.valid) {
        setPromo({
          code: data.code ?? discountCode.toUpperCase(),
          discount_amount: data.discount_amount ?? 0,
          type: data.type ?? "percent",
          value: data.value ?? 0,
        });
      } else {
        setPromo(null);
      }
    } catch {
      setPromo(null);
    }
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setPromo(null);
  }, []);

  const applyPromo = useCallback((next: AppliedPromo) => {
    setPromo(next);
  }, []);

  const clearPromo = useCallback(() => {
    setPromo(null);
  }, []);

  const itemCount = useMemo(() => cartItemCount(lines), [lines]);
  const subtotalEgp = useMemo(() => cartSubtotal(lines), [lines]);
  const discountEgp = promo?.discount_amount ?? 0;

  const value = useMemo(
    () => ({
      lines,
      isDrawerOpen,
      lastUpsellSourceProductId,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      addItem,
      addGiftBoxItem,
      addBundleOfferItem,
      restoreGiftBox,
      restoreCart,
      setQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotalEgp,
      promo,
      discountEgp,
      applyPromo,
      clearPromo,
      checkoutIdempotencyKey,
    }),
    [
      lines,
      isDrawerOpen,
      lastUpsellSourceProductId,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      addItem,
      addGiftBoxItem,
      addBundleOfferItem,
      restoreGiftBox,
      restoreCart,
      setQuantity,
      removeItem,
      clearCart,
      itemCount,
      subtotalEgp,
      promo,
      discountEgp,
      applyPromo,
      clearPromo,
      checkoutIdempotencyKey,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {trackAbandon ? <AbandonedCartTracker /> : null}
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
