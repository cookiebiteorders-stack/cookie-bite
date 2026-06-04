"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/data";
import { ProductAddonPicker, useAddonSelectionState } from "@/components/product/product-addon-picker";
import { ProductCartActions } from "@/components/product/product-cart-actions";
import { useLanguage } from "@/components/providers/language-provider";
import { buildCartLineId } from "@/lib/cart/types";
import { useCart } from "@/components/providers/cart-provider";
import type { Addon } from "@/lib/addons/types";

type Props = {
  product: Product;
  linkedAddons?: Addon[];
};

export function PdpActions({ product, linkedAddons = [] }: Props) {
  const { t } = useLanguage();
  const { lines } = useCart();
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
  );
}
