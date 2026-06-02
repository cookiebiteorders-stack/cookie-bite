import type { Product } from "@/lib/data";
import type { CartSelectedAddon } from "@/lib/addons/types";

export type CartLine = {
  id: string;
  /** slug — used in checkout API */
  productId: string;
  /** UUID — used for analytics / recommendations */
  productUuid?: string;
  name: string;
  priceEgp: number;
  image: string;
  quantity: number;
  addons: CartSelectedAddon[];
  addonsTotalEgp: number;
  finalUnitPriceEgp: number;
};

export function lineFromProduct(
  product: Product,
  quantity: number,
  addons: CartSelectedAddon[] = [],
  addonsTotalEgp = 0,
): CartLine {
  const lineId = buildCartLineId(product.id, addons);
  const basePrice = Number(product.price);
  return {
    id: lineId,
    productId: product.id,
    productUuid: product.productUuid,
    name: product.name,
    priceEgp: basePrice,
    image: product.image,
    quantity: Math.min(99, Math.max(1, quantity)),
    addons,
    addonsTotalEgp,
    finalUnitPriceEgp: basePrice + addonsTotalEgp,
  };
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.finalUnitPriceEgp * l.quantity, 0);
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function buildCartLineId(productId: string, addons: CartSelectedAddon[]) {
  if (!addons.length) return productId;
  const parts = addons
    .map((a) => {
      const options = a.options
        .map((o) => `${o.option_id}:${o.quantity}`)
        .sort()
        .join("|");
      return `${a.addon_id}=${options}`;
    })
    .sort()
    .join(";");
  return `${productId}::${parts}`;
}
