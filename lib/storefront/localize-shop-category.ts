import { OUR_COOKIE_SECTION_DEFS } from "@/lib/data";
import type { Lang } from "@/lib/i18n/translations";

export type ShopCategoryLabelRow = {
  name_en: string;
  name_ar: string | null;
};

function translationSectionId(sectionId: string, shopCategory: string): string {
  const cat = shopCategory.toLowerCase();
  if (cat.includes("gift")) return "gifts";
  if (cat.includes("bite")) return "bites";
  return sectionId;
}

function sectionTitleKey(sectionId: string, shopCategory: string): string {
  const id = translationSectionId(sectionId, shopCategory);
  return `pages.ourCookies.sections.${id}.title`;
}

/** Maps canonical `products.category` (English) → display label for current language. */
export function buildShopCategoryLabelLookup(
  rows: ShopCategoryLabelRow[],
  lang: Lang,
  t: (key: string) => string,
): Record<string, string> {
  const lookup: Record<string, string> = {};

  for (const row of rows) {
    const key = row.name_en.trim();
    if (!key) continue;
    lookup[key] = lang === "ar" ? row.name_ar?.trim() || key : key;
  }

  for (const def of OUR_COOKIE_SECTION_DEFS) {
    const key = def.shopCategory;
    if (lookup[key]) continue;
    const tKey = sectionTitleKey(def.id, def.shopCategory);
    const translated = t(tKey);
    lookup[key] = translated !== tKey ? translated : key;
  }

  return lookup;
}

export function localizeShopCategory(
  category: string,
  lookup: Record<string, string>,
  t: (key: string) => string,
): string {
  if (category === "All") return t("pages.shop.categoryAll");
  return lookup[category] ?? category;
}
