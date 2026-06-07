import { pickProductRestorePatch } from "@/lib/admin/product-versions";

describe("pickProductRestorePatch", () => {
  it("strips immutable keys", () => {
    const patch = pickProductRestorePatch({
      id: "abc",
      created_at: "2020-01-01",
      updated_at: "2020-01-02",
      name: "Cookie",
      price_egp: 120,
    });
    expect(patch).toEqual({ name: "Cookie", price_egp: 120 });
    expect(patch).not.toHaveProperty("id");
    expect(patch).not.toHaveProperty("created_at");
  });

  it("preserves catalog fields", () => {
    const patch = pickProductRestorePatch({
      id: "x",
      sku: "CB-1",
      stock: 5,
      is_active: false,
      meta_title: "SEO",
    });
    expect(patch).toMatchObject({
      sku: "CB-1",
      stock: 5,
      is_active: false,
      meta_title: "SEO",
    });
  });
});
