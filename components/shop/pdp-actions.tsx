"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/data";
import { ProductAddonPicker, useAddonSelectionState } from "@/components/product/product-addon-picker";
import { ProductCartActions } from "@/components/product/product-cart-actions";
import { PdpStickyBar } from "@/components/shop/pdp-sticky-bar";
import { useLanguage } from "@/components/providers/language-provider";
import { buildCartLineId } from "@/lib/cart/types";
import { useCart } from "@/components/providers/cart-provider";
import type { Addon } from "@/lib/addons/types";

type Props = {
  product: Product;
  linkedAddons?: Addon[];
};

export function PdpActions({ product, linkedAddons = [] }: Props) {
  const { t, formatPrice } = useLanguage();
  const { lines } = useCart();
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [purchaseVisible, setPurchaseVisible] = useState(true);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const outOfStock = product.stock != null && product.stock <= 0;
  const maxQty =
    product.stock != null && product.stock > 0
      ? Math.min(99, product.stock)
      : 99;

  const lineId = useMemo(
    () => buildCartLineId(product.id, selectedAddons),
    [product.id, selectedAddons],
  );
  const inCart = useMemo(
    () => lines.some((l) => l.id === lineId && !l.giftBox),
    [lines, lineId],
  );

  const unitPrice = product.price + addonsTotal;
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
