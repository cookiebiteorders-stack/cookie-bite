"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/data";
import { trackProductEvent } from "@/lib/analytics/track-event";
import { useCart } from "@/components/providers/cart-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Addon, CartSelectedAddon } from "@/lib/addons/types";

type Props = {
  product: Product;
  linkedAddons?: Addon[];
};

type SelectedMap = Record<string, Record<string, number>>;

export function PdpActions({ product, linkedAddons = [] }: Props) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<SelectedMap>({});
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  useEffect(() => {
    const defaults: SelectedMap = {};
    for (const addon of linkedAddons) {
      const picked: Record<string, number> = {};
      for (const opt of addon.options) {
        if (opt.default_selected) picked[opt.id] = 1;
      }
      defaults[addon.id] = picked;
    }
    setSelected(defaults);
  }, [linkedAddons]);

  const outOfStock = product.stock != null && product.stock <= 0;
  const maxQty =
    product.stock != null && product.stock > 0
      ? Math.min(99, product.stock)
      : 99;

  const selectedAddons: CartSelectedAddon[] = linkedAddons
    .map((addon) => {
      const map = selected[addon.id] ?? {};
      const options = addon.options
        .filter((opt) => (map[opt.id] ?? 0) > 0)
        .map((opt) => ({
          option_id: opt.id,
          quantity: map[opt.id],
          price_snapshot: Number(opt.price),
        }));
      return { addon_id: addon.id, options };
    })
    .filter((a) => a.options.length > 0);

  const addonsTotal = selectedAddons.reduce(
    (sum, addon) =>
      sum + addon.options.reduce((inner, opt) => inner + opt.price_snapshot * opt.quantity, 0),
    0,
  );

  function toggleSingle(addonId: string, optionId: string) {
    setSelected((prev) => ({
      ...prev,
      [addonId]: { [optionId]: 1 },
    }));
  }

  function toggleMulti(addonId: string, optionId: string, checked: boolean) {
    setSelected((prev) => {
      const addonMap = { ...(prev[addonId] ?? {}) };
      if (checked) addonMap[optionId] = addonMap[optionId] || 1;
      else delete addonMap[optionId];
      return { ...prev, [addonId]: addonMap };
    });
  }

  function setAddonQty(addonId: string, optionId: string, qtyValue: number, limit?: number | null) {
    const safe = Math.max(0, Math.min(limit ?? 99, qtyValue));
    setSelected((prev) => {
      const addonMap = { ...(prev[addonId] ?? {}) };
      if (safe === 0) delete addonMap[optionId];
      else addonMap[optionId] = safe;
      return { ...prev, [addonId]: addonMap };
    });
  }

  function validateSelection() {
    for (const addon of linkedAddons) {
      const map = selected[addon.id] ?? {};
      const chosen = Object.values(map).filter((v) => v > 0).length;
      if (addon.required && chosen === 0) {
        return `Please select ${addon.name}`;
      }
      for (const option of addon.options) {
        const q = map[option.id] ?? 0;
        if (option.quantity_limit != null && q > option.quantity_limit) {
          return `${option.name} exceeds quantity limit`;
        }
      }
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {linkedAddons.length > 0 ? (
        <div className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface p-4">
          <p className="text-sm font-bold text-cb-text-strong">Add-ons</p>
          {linkedAddons.map((addon) => {
            const map = selected[addon.id] ?? {};
            return (
              <div key={addon.id} className="space-y-2 border-b border-cb-border pb-3 last:border-0">
                <p className="text-sm font-semibold">
                  {addon.name} {addon.required ? "*" : ""}
                </p>
                {addon.options.map((opt) => {
                  const checked = (map[opt.id] ?? 0) > 0;
                  const currentQty = map[opt.id] ?? 0;
                  return (
                    <div key={opt.id} className="rounded-lg border border-cb-border/70 p-2 text-sm">
                      <label className="flex items-center justify-between gap-2">
                        <span>
                          {opt.name} {opt.size ? `(${opt.size})` : ""} - {Number(opt.price).toFixed(0)} EGP
                        </span>
                        {addon.type === "single_choice" ? (
                          <input
                            type="radio"
                            name={`addon-${addon.id}`}
                            checked={checked}
                            onChange={() => toggleSingle(addon.id, opt.id)}
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleMulti(addon.id, opt.id, e.target.checked)}
                          />
                        )}
                      </label>
                      {checked && (opt.quantity_limit != null || addon.type === "multiple_choice") ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button type="button" className="rounded border px-2" onClick={() => setAddonQty(addon.id, opt.id, currentQty - 1, opt.quantity_limit)}>−</button>
                          <span className="min-w-5 text-center">{currentQty}</span>
                          <button type="button" className="rounded border px-2" onClick={() => setAddonQty(addon.id, opt.id, currentQty + 1, opt.quantity_limit)}>+</button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <p className="text-xs font-semibold text-cb-terracotta-dark">
            Add-ons total: {addonsTotal.toFixed(0)} EGP
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3 rounded-full border-2 border-cb-border bg-cb-surface px-2 py-2 opacity-100">
        <button
          type="button"
          className="rounded-full p-2 text-cb-text hover:bg-cb-peach disabled:opacity-40"
          aria-label="Decrease quantity"
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
          aria-label="Increase quantity"
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
          const validationError = validateSelection();
          if (validationError) {
            setError(validationError);
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
          ? "Out of stock"
          : `Add to cart — ${((product.price + addonsTotal) * qty).toFixed(0)} EGP`}
      </button>
      </div>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
