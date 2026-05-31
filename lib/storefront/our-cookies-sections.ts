import type { Product } from "@/lib/data";
import { OUR_COOKIE_SECTION_DEFS, type OurCookieSectionIcon } from "@/lib/data";

export type OurCookiesSection = {
  id: string;
  shopCategory: string;
  icon: OurCookieSectionIcon;
  items: Product[];
};

function categorySectionId(category: string): string {
  return (
    category
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "other"
  );
}

/** يجمع منتجات المتجر حسب الفئة — مع أقسام جديدة تلقائياً لأي category في قاعدة البيانات. */
export function buildOurCookiesSections(products: Product[]): OurCookiesSection[] {
  const byCategory = new Map<string, Product[]>();
  for (const product of products) {
    const cat = product.category?.trim() || "Classic";
    const list = byCategory.get(cat) ?? [];
    list.push(product);
    byCategory.set(cat, list);
  }

  const seen = new Set<string>();
  const sections: OurCookiesSection[] = [];

  for (const def of OUR_COOKIE_SECTION_DEFS) {
    const items = byCategory.get(def.shopCategory) ?? [];
    seen.add(def.shopCategory);
    if (items.length === 0) continue;
    sections.push({
      id: def.id,
      shopCategory: def.shopCategory,
      icon: def.icon,
      items,
    });
  }

  const extraCategories = [...byCategory.keys()]
    .filter((cat) => !seen.has(cat))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  for (const shopCategory of extraCategories) {
    const items = byCategory.get(shopCategory) ?? [];
    if (items.length === 0) continue;
    sections.push({
      id: categorySectionId(shopCategory),
      shopCategory,
      icon: "cookie",
      items,
    });
  }

  return sections;
}
