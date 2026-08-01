"use client";

import { forwardRef, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag, Zap } from "lucide-react";
import type { Addon, CartSelectedAddon } from "@/lib/addons/types";
import type { AddonSelectedMap } from "@/lib/addons/selection";
import { validateAddonSelection } from "@/lib/addons/selection";
import { buildCartLineId } from "@/lib/cart/types";
import type { Product, ProductVariant } from "@/lib/data";
import { isProductOutOfStock } from "@/lib/products/stock";
import { trackGa4Event } from "@/lib/analytics/ga4";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ProductCartActionsProps = {
  product: Product;
  addons: Addon[];
  selected: AddonSelectedMap;
  selectedAddons: CartSelectedAddon[];
  addonsTotal: number;
  /** الحجم المختار — يحدد السعر والمخزون */
  selectedVariant?: ProductVariant | null;
  /** للمنتجات ذات الأحجام: يلزم اختيار حجم قبل الإضافة */
  requireVariantSelection?: boolean;
  variant?: "card" | "pdp";
  /** كمية الإضافة الأولى (صفحة المنتج فقط) */
  addQuantity?: number;
  onAddonError?: (message: string | null) => void;
  /** BUY NOW mode - skip cart and go to checkout */
  buyNow?: boolean;
};

function useCartLine(
  product: Product,
  selectedAddons: CartSelectedAddon[],
  variantId?: string | null,
) {
  const { lines } = useCart();
  const lineId = useMemo(
    () => buildCartLineId(product.id, selectedAddons, variantId),
    [product.id, selectedAddons, variantId],
  );
  const cartLine = useMemo(
    () => lines.find((l) => l.id === lineId && !l.giftBox),
    [lines, lineId],
  );
  return { lineId, cartLine };
}

function trackAdd(product: Product, quantity: number) {
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
}

export const ProductCartActions = forwardRef<HTMLButtonElement, ProductCartActionsProps>(
  function ProductCartActions(
    {
  product,
  addons,
  selected,
  selectedAddons,
  addonsTotal,
  selectedVariant = null,
  requireVariantSelection = false,
  variant = "card",
  addQuantity = 1,
  onAddonError,
  buyNow = false,
},
    ref,
  ) {
  const { addItem, setQuantity } = useCart();
  const { t, formatPrice } = useLanguage();
  const router = useRouter();
  const { lineId, cartLine } = useCartLine(product, selectedAddons, selectedVariant?.id);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const id = window.setTimeout(() => setJustAdded(false), 2000);
    return () => window.clearTimeout(id);
  }, [justAdded]);

  const effectiveStock = requireVariantSelection
    ? selectedVariant?.stock ?? null
    : product.stock;
  const outOfStock = requireVariantSelection
    ? selectedVariant != null && isProductOutOfStock(selectedVariant.stock)
    : isProductOutOfStock(product.stock);
  const maxQty =
    effectiveStock != null && effectiveStock > 0
      ? Math.min(99, effectiveStock)
      : 99;
  const unitPrice = (selectedVariant?.price ?? product.price) + addonsTotal;

  const stepperShell = cn(
    "flex w-full items-center justify-between gap-1 rounded-full border-2 border-cb-terracotta-dark bg-cb-terracotta-dark px-1 py-1 text-white shadow-sm",
    variant === "pdp" && "min-h-12 flex-1 sm:max-w-xs",
    variant === "card" && "py-1",
  );

  const stepperBtn = cn(
    "rounded-full p-2 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40",
    variant === "pdp" ? "p-2.5" : "p-2",
  );

  if (outOfStock) {
    if (variant === "card") {
      return (
        <p className="w-full rounded-full border border-cb-border bg-cb-surface-2 py-3 text-center text-sm font-bold text-cb-text-muted">
          {t("product.outOfStock")}
        </p>
      );
    }
    return null;
  }

  if (justAdded) {
    return (
      <div
        className={cn(
          buttonClassName("primary"),
          "inline-flex w-full cursor-default items-center justify-center gap-2 rounded-full bg-emerald-700 ring-emerald-700",
          variant === "pdp" ? "min-h-12 flex-1 sm:max-w-xs" : "py-3 text-sm",
        )}
        role="status"
        aria-live="polite"
      >
        <Check className={cn("shrink-0", variant === "pdp" ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
        {t("product.addedSuccess")}
      </div>
    );
  }

  if (cartLine) {
    const atMax = cartLine.quantity >= maxQty;
    return (
      <div
        className={stepperShell}
        role="group"
        aria-label={t("product.quantityInCart")}
      >
        <button
          type="button"
          className={stepperBtn}
          aria-label={t("pages.cart.decreaseQty")}
          onClick={() => setQuantity(lineId, cartLine.quantity - 1)}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <span
          className={cn(
            "min-w-[2.5rem] flex-1 text-center font-bold tabular-nums",
            variant === "pdp" ? "text-base" : "text-sm",
          )}
        >
          {cartLine.quantity}
        </span>
        <button
          type="button"
          className={stepperBtn}
          aria-label={t("pages.cart.increaseQty")}
          disabled={atMax}
          onClick={() => setQuantity(lineId, cartLine.quantity + 1)}
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
    );
  }

  const qty = Math.max(1, Math.min(maxQty, addQuantity));

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        buttonClassName(buyNow ? "primary" : "primary"),
        "inline-flex w-full items-center justify-center gap-2 rounded-full",
        variant === "pdp" ? "min-h-12 flex-1 gap-2 sm:max-w-xs" : "py-3 text-sm",
        buyNow && "bg-cb-terracotta-dark hover:bg-cb-terracotta-dark/90",
      )}
      onClick={() => {
        if (requireVariantSelection && !selectedVariant) {
          onAddonError?.(t("product.selectSizeFirst"));
          return;
        }
        const missing = validateAddonSelection(addons, selected);
        if (missing) {
          onAddonError?.(t("product.addonsRequired", { name: missing }));
          return;
        }
        onAddonError?.(null);
        addItem(product, qty, selectedAddons, addonsTotal, selectedVariant);
        trackAdd(product, qty);
        trackGa4Event("add_to_cart", {
          currency: "EGP",
          value: unitPrice * qty,
          items: [
            {
              item_id: product.id,
              item_name: product.name,
              price: unitPrice,
              quantity: qty,
            },
          ],
        });
        if (buyNow) {
          router.push("/checkout/details");
        } else {
          setJustAdded(true);
        }
      }}
    >
      {buyNow ? (
        <Zap className={cn("shrink-0", variant === "pdp" ? "h-5 w-5" : "h-4 w-4")} aria-hidden />
      ) : (
        <ShoppingBag
          className={cn("shrink-0", variant === "pdp" ? "h-5 w-5" : "h-4 w-4")}
          aria-hidden
        />
      )}
      {buyNow
        ? "BUY NOW"
        : variant === "pdp"
          ? t("product.addToCartWithPrice", {
              price: formatPrice(unitPrice * qty),
            })
          : addons.length > 0
            ? t("product.addToCartWithPrice", { price: formatPrice(unitPrice) })
            : t("product.addToCart")}
    </button>
  );
},
);
