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
  giftBox?: {
    box_size: string;
    selected_products: {
      product_id: string;
      quantity: number;
      price_snapshot: number;
      name?: string;
      image?: string;
    }[];
    message?: string | null;
    total_price: number;
    builder?: Record<string, unknown>;
  };
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

export function giftBoxLine(input: {
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
}): CartLine {
  return {
    id: `gift-box:${input.id}`,
    productId: `gift-box:${input.id}`,
    name: input.name,
    image: input.image,
    priceEgp: input.totalPrice,
    quantity: 1,
    addons: [],
    addonsTotalEgp: 0,
    finalUnitPriceEgp: input.totalPrice,
    giftBox: {
      box_size: input.boxSize,
      selected_products: input.selectedProducts,
      message: input.message ?? null,
      total_price: input.totalPrice,
      builder: input.builder,
    },
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
