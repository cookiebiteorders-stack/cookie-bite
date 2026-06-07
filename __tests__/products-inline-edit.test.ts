import {
  applyPriceAdjustment,
  buildPatchFromPending,
  parseClipboardColumn,
  validatePendingEdit,
} from "@/lib/admin/products-inline-edit";

describe("products-inline-edit", () => {
  it("validates stock as non-negative integer", () => {
    expect(validatePendingEdit("stock", "12").ok).toBe(true);
    expect(validatePendingEdit("stock", "-1").ok).toBe(false);
    expect(validatePendingEdit("stock", "3.5").ok).toBe(false);
  });

  it("builds patch from pending edits", () => {
    const result = buildPatchFromPending({ price_egp: "150", stock: "8" });
    expect("patch" in result).toBe(true);
    if ("patch" in result) {
      expect(result.patch).toEqual({ price_egp: 150, stock: 8 });
    }
  });

  it("applies percent price adjustment", () => {
    expect(applyPriceAdjustment(100, "percent_add", 10)).toBe(110);
    expect(applyPriceAdjustment(100, "percent_subtract", 10)).toBe(90);
    expect(applyPriceAdjustment(100, "set_fixed", 75)).toBe(75);
  });

  it("parses clipboard column from excel paste", () => {
    expect(parseClipboardColumn("10\n20\n30")).toEqual(["10", "20", "30"]);
    expect(parseClipboardColumn("10\textra\n20")).toEqual(["10", "20"]);
  });
});
