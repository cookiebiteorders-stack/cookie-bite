"use client";

import dynamic from "next/dynamic";
import { useCart } from "@/components/providers/cart-provider";
import { useDeferredReady } from "@/lib/hooks/use-deferred-ready";

const CartDrawer = dynamic(
  () => import("@/components/cart/cart-drawer").then((m) => m.CartDrawer),
  { ssr: false, loading: () => null },
);

/** يؤجّل حزمة السلة حتى idle — لكن يُحمَّل فوراً عند فتح الدرج. */
export function CartDrawerGate() {
  const { isDrawerOpen } = useCart();
  const deferred = useDeferredReady();

  if (!deferred && !isDrawerOpen) return null;
  return <CartDrawer />;
}
