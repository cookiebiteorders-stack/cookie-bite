import type { Product } from "@/lib/data";

export type CartLine = {
  /** slug — used in checkout API */
  productId: string;
  /** UUID — used for analytics / recommendations */
  productUuid?: string;
  name: string;
  priceEgp: number;
  image: string;
  quantity: number;
};

export function lineFromProduct(product: Product, quantity: number): CartLine {
  return {
    productId: product.id,
    productUuid: product.productUuid,
    name: product.name,
    priceEgp: product.price,
    image: product.image,
    quantity: Math.min(99, Math.max(1, quantity)),
  };
}

export function cartSubtotal(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.priceEgp * l.quantity, 0);
}

export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
