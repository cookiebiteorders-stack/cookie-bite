/** تصنيفات افتراضية للكتالوج — متوافقة مع فلاتر المتجر والصفحة الرئيسية */

export type ProductCategoryOption = {
  value: string;
  labelAr: string;
  labelEn: string;
};

export const DEFAULT_PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  { value: "Classic", labelAr: "كلاسيك", labelEn: "Classic" },
  { value: "Chocolate Lovers", labelAr: "عشاق الشوكولاتة", labelEn: "Chocolate Lovers" },
  { value: "Stuffed", labelAr: "محشوة", labelEn: "Stuffed" },
  { value: "Premium", labelAr: "فاخرة", labelEn: "Premium" },
  { value: "Seasonal", labelAr: "موسمية", labelEn: "Seasonal" },
  { value: "Gifts", labelAr: "هدايا ومناسبات", labelEn: "Gifts" },
  { value: "Gift Box", labelAr: "بوكس هدايا", labelEn: "Gift Box" },
  { value: "Bites & More", labelAr: "قضمات وأكثر", labelEn: "Bites & More" },
];

export const DEFAULT_PRODUCT_CATEGORY = DEFAULT_PRODUCT_CATEGORIES[0]!.value;

export function isKnownProductCategory(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return DEFAULT_PRODUCT_CATEGORIES.some((c) => c.value === v);
}
