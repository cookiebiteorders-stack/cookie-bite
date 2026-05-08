"use client";

import { useEffect } from "react";
import { useCart } from "@/components/providers/cart-provider";

type Props = {
  when: boolean;
};

/** يمسح السلة مرة واحدة عند الوصول لصفحة نجاح الطلب. */
export function ClearCartOnce({ when }: Props) {
  const { clearCart, itemCount } = useCart();

  useEffect(() => {
    if (!when || itemCount === 0) return;
    clearCart();
  }, [when, itemCount, clearCart]);

  return null;
}
