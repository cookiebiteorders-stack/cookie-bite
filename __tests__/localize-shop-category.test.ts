import {
  buildShopCategoryLabelLookup,
  localizeShopCategory,
} from "@/lib/storefront/localize-shop-category";

const t = (key: string) => {
  const map: Record<string, string> = {
    "pages.shop.categoryAll": "الكل",
    "pages.ourCookies.sections.classic.title": "الكلاسيكيات المميزة",
    "pages.ourCookies.sections.chocolate.title": "محبّو الشوكولاتة",
  };
  return map[key] ?? key;
};

describe("localize-shop-category", () => {
  it("uses DB Arabic names when available", () => {
    const lookup = buildShopCategoryLabelLookup(
      [{ name_en: "Premium", name_ar: "فاخر" }],
      "ar",
      t,
    );
    expect(localizeShopCategory("Premium", lookup, t)).toBe("فاخر");
  });

  it("falls back to ourCookies section translations", () => {
    const lookup = buildShopCategoryLabelLookup([], "ar", t);
    expect(localizeShopCategory("Classic", lookup, t)).toBe("الكلاسيكيات المميزة");
    expect(localizeShopCategory("Chocolate Lovers", lookup, t)).toBe("محبّو الشوكولاتة");
  });

  it("localizes All via pages.shop.categoryAll", () => {
    const lookup = buildShopCategoryLabelLookup([], "ar", t);
    expect(localizeShopCategory("All", lookup, t)).toBe("الكل");
  });
});
