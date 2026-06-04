"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { ProductAddonPicker, useAddonSelectionState } from "@/components/product/product-addon-picker";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { validateAddonSelection } from "@/lib/addons/selection";
import { cn } from "@/lib/utils";
import type { Addon } from "@/lib/addons/types";

type Props = {
  product: Product;
  linkedAddons?: Addon[];
};

export function PdpActions({ product, linkedAddons = [] }: Props) {
  const { t, formatPrice } = useLanguage();
  const { addons, selected, setSelected, selectedAddons, addonsTotal } =
    useAddonSelectionState(linkedAddons, { emptyOptional: true });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();

  const outOfStock = product.stock != null && product.stock <= 0;
  const maxQty =
    product.stock != null && product.stock > 0
      ? Math.min(99, product.stock)
      : 99;

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
        <button
          type="button"
          disabled={outOfStock}
          className={cn(
            buttonClassName("primary", "flex-1 gap-2 sm:max-w-xs"),
            "min-h-12 disabled:cursor-not-allowed disabled:opacity-50",
          )}
          onClick={() => {
            if (outOfStock) return;
            const missing = validateAddonSelection(addons, selected);
            if (missing) {
              setError(t("product.addonsRequired", { name: missing }));
              return;
            }
            setError(null);
            addItem(product, qty, selectedAddons, addonsTotal);
            if (product.productUuid) {
              trackProductEvent({
                product_id: product.productUuid,
                event_type: "add_to_cart",
                metadata: { quantity: qty, slug: product.id },
              });
            } else {
              trackProductEvent({
                product_slug: product.id,
                event_type: "add_to_cart",
                metadata: { quantity: qty },
              });
            }
            setQty(1);
          }}
        >
          <ShoppingBag className="h-5 w-5" aria-hidden />
          {outOfStock
            ? t("product.outOfStock")
            : t("product.addToCartWithPrice", {
                price: formatPrice((product.price + addonsTotal) * qty),
              })}
        </button>
      </div>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
