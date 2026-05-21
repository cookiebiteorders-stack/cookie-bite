/**
 * الشارات والمواسم المعتمدة في المتجر ولوحة المنتجات.
 */

export type CatalogOption = {
  value: string;
  labelAr: string;
  labelEn: string;
};

/** شارات تظهر في المتجر / الفلاتر / بطاقة المنتج */
export const PRODUCT_BADGE_OPTIONS: CatalogOption[] = [
  { value: "bestseller", labelAr: "الأكثر مبيعًا", labelEn: "Bestseller" },
  { value: "new", labelAr: "جديد", labelEn: "New" },
  { value: "trending", labelAr: "رائج", labelEn: "Trending" },
  { value: "featured", labelAr: "مميز", labelEn: "Featured" },
];

/** مواسم / مناسبات للتصفية والكتالوج */
export const PRODUCT_SEASON_OPTIONS: CatalogOption[] = [
  { value: "ramadan", labelAr: "رمضان", labelEn: "Ramadan" },
  { value: "eid", labelAr: "عيد", labelEn: "Eid" },
  { value: "summer", labelAr: "صيف", labelEn: "Summer" },
  { value: "winter", labelAr: "شتاء", labelEn: "Winter" },
  { value: "spring", labelAr: "ربيع", labelEn: "Spring" },
  { value: "valentine", labelAr: "عيد الحب", labelEn: "Valentine" },
  { value: "christmas", labelAr: "كريسماس", labelEn: "Christmas" },
];

export const PRODUCT_BADGE_VALUES = new Set(PRODUCT_BADGE_OPTIONS.map((o) => o.value));
export const PRODUCT_SEASON_VALUES = new Set(PRODUCT_SEASON_OPTIONS.map((o) => o.value));

export function parseCatalogCsv(value: string): string[] {
  return value
    .split(/[,،\n]/g)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function joinCatalogCsv(values: string[]): string {
  return [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))].join(", ");
}

export function filterValidBadges(values: string[]): string[] {
  return values.filter((v) => PRODUCT_BADGE_VALUES.has(v));
}

export function filterValidSeasons(values: string[]): string[] {
  return values.filter((v) => PRODUCT_SEASON_VALUES.has(v));
}

export function labelForBadge(value: string): string {
  return PRODUCT_BADGE_OPTIONS.find((o) => o.value === value)?.labelAr ?? value;
}

export function labelForSeason(value: string): string {
  return PRODUCT_SEASON_OPTIONS.find((o) => o.value === value)?.labelAr ?? value;
}
