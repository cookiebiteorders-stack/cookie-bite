/** نسبة الخصم الافتراضية من سعر المقارنة عند التعبئة التلقائية. */
export const DEFAULT_DISCOUNT_PERCENT = 12;

export type ProductDiscount = {
  comparePrice: number;
  salePrice: number;
  amountEgp: number;
  percent: number;
};

export function deriveCompareFromDiscountPercent(price: number, discountPercent: number): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) return "";
  return String(Math.round(price / (1 - discountPercent / 100)));
}

export function deriveDiscountPercentFromPrices(price: number, compare: number): string {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(compare) || compare <= price) {
    return "";
  }
  const pct = ((compare - price) / compare) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function getProductDiscount(
  salePrice: number,
  comparePrice?: number | null,
): ProductDiscount | null {
  if (!Number.isFinite(salePrice) || salePrice <= 0) return null;
  if (comparePrice == null || !Number.isFinite(comparePrice) || comparePrice <= salePrice) {
    return null;
  }
  const amountEgp = Math.round(comparePrice - salePrice);
  const percent = Math.round(((comparePrice - salePrice) / comparePrice) * 1000) / 10;
  return {
    comparePrice,
    salePrice,
    amountEgp,
    percent,
  };
}

/** Storefront prices always use Western numerals and EGP, regardless of UI language. */
export const STOREFRONT_PRICE_LOCALE = "en-EG" as const;

export function formatProductPriceNumber(amount: number): string {
  return amount.toLocaleString(STOREFRONT_PRICE_LOCALE, { maximumFractionDigits: 0 });
}

export function formatProductPriceEgp(
  amount: number,
  _locale?: "ar-EG" | "en-EG",
): string {
  return `${formatProductPriceNumber(amount)} EGP`;
}
