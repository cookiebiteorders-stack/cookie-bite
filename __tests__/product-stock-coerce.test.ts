import { coerceStringArray } from "@/lib/products/coerce";
import { isProductInStock, isProductOutOfStock } from "@/lib/products/stock";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";
import type { ProductRow } from "@/lib/db/types";

describe("product stock helpers", () => {
  it("treats null stock as in stock", () => {
    expect(isProductInStock(null)).toBe(true);
    expect(isProductOutOfStock(null)).toBe(false);
  });

  it("treats zero stock as out of stock", () => {
    expect(isProductOutOfStock(0)).toBe(true);
    expect(isProductInStock(0)).toBe(false);
  });
});

describe("coerceStringArray", () => {
  it("parses JSON string badges", () => {
    expect(coerceStringArray('["new","featured"]')).toEqual(["new", "featured"]);
  });
});

describe("productRowToStorefrontProduct badges", () => {
  const base: ProductRow = {
    id: "uuid-1",
    slug: "test-cookie",
    name: "Test",
    description: null,
    title_en: "Test",
    title_ar: null,
    description_en: null,
    description_ar: null,
    price_egp: 100,
    compare_price_egp: null,
    sku: null,
    category: "Classic",
    image_url: null,
    images: [],
    video_url: null,
    badges: '["new"]' as unknown as string[],
    dietary: [],
    seasons: [],
    is_active: true,
    stock: 5,
    weight_grams: null,
    pieces_count: null,
    sanity_id: null,
    created_at: "",
    updated_at: "",
  };

  it("does not throw when badges is a JSON string", () => {
    const p = productRowToStorefrontProduct(base, "desc");
    expect(p.badges).toEqual(["new"]);
  });
});
