"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product, ProductVariant } from "@/lib/data";
import { ProductAddonPicker, useAddonSelectionState } from "@/components/product/product-addon-picker";
import { ProductCartActions } from "@/components/product/product-cart-actions";
import { ProductVariantPicker } from "@/components/product/product-variant-picker";
import { PdpStickyBar } from "@/components/shop/pdp-sticky-bar";
import { useLanguage } from "@/components/providers/language-provider";
import { buildCartLineId } from "@/lib/cart/types";
import { useCart } from "@/components/providers/cart-provider";
import { EMPTY_LINKED_ADDONS } from "@/lib/addons/constants";
import type { Addon } from "@/lib/addons/types";

type Props = {
  product: Product;
  linkedAddons?: Addon[];
  selectedVariant?: ProductVariant | null;
  onVariantChange?: (variantId: string) => void;
};

export function PdpActions({
  product,
  linkedAddons = EMPTY_LINKED_ADDONS,
  selectedVariant = null,
  onVariantChange,
}: Props) {
  const { t, formatPrice } = useLanguage();
  const { lines } = useCart();
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [purchaseVisible, setPurchaseVisible] = useState(true);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const variants = product.variants ?? [];
  const hasVariants = Boolean(product.hasVariants && variants.length > 0);
  const effectiveStock = hasVariants
    ? selectedVariant?.stock ?? null
    : product.stock ?? null;
  const effectivePrice = selectedVariant?.price ?? product.price;

  const outOfStock = effectiveStock != null && effectiveStock <= 0;
  const maxQty =
    effectiveStock != null && effectiveStock > 0
      ? Math.min(99, effectiveStock)
      : 99;

  const lineId = useMemo(
    () => buildCartLineId(product.id, selectedAddons, selectedVariant?.id),
    [product.id, selectedAddons, selectedVariant?.id],
  );
  const inCart = useMemo(
    () => lines.some((l) => l.id === lineId && !l.giftBox),
    [lines, lineId],
  );

  const unitPrice = effectivePrice + addonsTotal;
  const stickyLabel = t("product.addToCartWithPrice", {
    price: formatPrice(unitPrice * qty),
  });

  useEffect(() => {
    const el = purchaseRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPurchaseVisible(entry?.isIntersecting ?? true),
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="space-y-4">
        {hasVariants ? (
          <div id="pdp-variants">
            <ProductVariantPicker
              variants={variants}
              selectedId={selectedVariant?.id ?? null}
              onSelect={(id) => onVariantChange?.(id)}
            />
          </div>
        ) : null}
        {addons.length > 0 ? (
          <div id="pdp-addons">
            <ProductAddonPicker
              variant="full"
              linkedAddons={addons}
              selected={selected}
              onSelectedChange={setSelected}
            />
          </div>
        ) : null}
        <div
          id="pdp-purchase"
          ref={purchaseRef}
          className="flex flex-col gap-4 sm:flex-row sm:items-center"
        >
          {!inCart ? (
            <div className="flex items-center gap-3 rounded-full border-2 border-cb-border bg-cb-surface px-2 py-2 opacity-100">
              <button
                type="button"
                className="rounded-full p-2 text-cb-text hover:bg-cb-peach disabled:opacity-40"
                aria-label={t("pages.cart.decreaseQty")}
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
                aria-label={t("pages.cart.increaseQty")}
                disabled={outOfStock}
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <ProductCartActions
            ref={addBtnRef}
            product={product}
            addons={addons}
            selected={selected}
            selectedAddons={selectedAddons}
            addonsTotal={addonsTotal}
            selectedVariant={selectedVariant}
            requireVariantSelection={hasVariants}
            variant="pdp"
            addQuantity={qty}
            onAddonError={setError}
          />
        </div>
        {outOfStock ? (
          <p className="text-sm font-semibold text-cb-text-muted">{t("product.outOfStock")}</p>
        ) : null}
        {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
      </div>

      {!inCart && !outOfStock ? (
        <PdpStickyBar
          product={product}
          purchaseVisible={purchaseVisible}
          disabled={outOfStock}
          unitPriceLabel={stickyLabel}
          onAddClick={() => {
            if (addons.length > 0) {
              document.getElementById("pdp-addons")?.scrollIntoView({ behavior: "smooth" });
            }
            addBtnRef.current?.click();
          }}
        />
      ) : null}
    </>
  );
}
