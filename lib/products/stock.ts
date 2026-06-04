/** منتج غير متوفر عندما يُعرَف المخزون ويكون ≤ 0. null = غير محدود (متوفر). */
export function isProductOutOfStock(stock?: number | null): boolean {
  return stock != null && stock <= 0;
}

export function isProductInStock(stock?: number | null): boolean {
  return !isProductOutOfStock(stock);
}
