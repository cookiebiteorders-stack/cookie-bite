import {
  analyzeProductTitle,
  buildPureArabicTitle,
  buildPureEnglishTitle,
  generateProductFieldsFromName,
  splitByScript,
} from "@/lib/admin/product-auto-fill";

describe("product-auto-fill", () => {
  it("splits mixed script segments", () => {
    expect(splitByScript("شوكولاتة Cookies")).toEqual([
      { text: "شوكولاتة", script: "ar" },
      { text: "Cookies", script: "en" },
    ]);
  });

  it("builds pure English title from Arabic input", () => {
    const a = analyzeProductTitle("كوكيز شوكولاتة فستق فاخرة");
    expect(buildPureEnglishTitle(a)).toMatch(/Chocolate/i);
    expect(buildPureEnglishTitle(a)).toMatch(/Cookies/i);
    expect(buildPureEnglishTitle(a)).not.toMatch(/[\u0600-\u06FF]/);
  });

  it("builds pure Arabic title from English input", () => {
    const a = analyzeProductTitle("Nutella Stuffed Cookies");
    const ar = buildPureArabicTitle(a);
    expect(ar).toMatch(/كوكيز/);
    expect(ar).toMatch(/نوتيلا|محشية/);
    expect(ar).not.toMatch(/[a-zA-Z]/);
  });

  it("keeps English-only titles fully English", () => {
    const fields = generateProductFieldsFromName("Classic Pistachio Cookies");
    expect(fields.title_en).toBe("Pistachio Classic Cookies");
    expect(fields.title_en).not.toMatch(/[\u0600-\u06FF]/);
    expect(fields.title_ar).not.toMatch(/[a-zA-Z]/);
  });

  it("keeps Arabic-only titles fully Arabic", () => {
    const fields = generateProductFieldsFromName("كوكيز لوتس محشية");
    expect(fields.title_ar).toMatch(/كوكيز/);
    expect(fields.title_ar).not.toMatch(/[a-zA-Z]/);
    expect(fields.title_en).not.toMatch(/[\u0600-\u06FF]/);
  });

  it("detects gift box category from mixed title", () => {
    const fields = generateProductFieldsFromName("Luxury Cookie Gift Box 12");
    expect(fields.category).toBe("Gift Box");
    expect(fields.pieces_count).toBe("12");
  });
});
