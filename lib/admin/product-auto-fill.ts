/**
 * توليد حقول المنتج تلقائياً من الاسم (نموذج إضافة منتج).
 */

import { DEFAULT_PRODUCT_CATEGORY } from "@/lib/admin/product-categories";
import type { ProductFormState } from "@/lib/admin/products-dashboard-types";
import { deriveProductSlug } from "@/lib/products/slug";

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function hasLatin(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/** تصنيف تقديري من كلمات الاسم */
export function inferCategoryFromName(name: string): string {
  const n = name.toLowerCase();
  const ar = name;

  if (/gift\s*box|بوكس|صندوق|هدية\s*و|بوكس\s*هد|علبة/i.test(n + ar)) return "Gift Box";
  if (/gift|هدية|مناسبة|occasion/i.test(n + ar)) return "Gifts";
  if (/stuffed|nutella|محشو|محشية|فستق|lotus|لوتس/i.test(n + ar)) return "Stuffed";
  if (/chocolate|choc|شوكولاتة|شوكولا|كاكاو/i.test(n + ar)) return "Chocolate Lovers";
  if (/premium|luxury|فاخر|فاخرة|signature/i.test(n + ar)) return "Premium";
  if (/seasonal|ramadan|eid|عيد|رمضان|موسم/i.test(n + ar)) return "Seasonal";
  if (/bite|قضمة|قضمات|mini|ميني/i.test(n + ar)) return "Bites & More";
  if (/brownie|براوني|براونيز/i.test(n + ar)) return "Chocolate Lovers";

  return DEFAULT_PRODUCT_CATEGORY;
}

export function defaultPriceForCategory(category: string): number {
  const c = category.toLowerCase();
  if (c.includes("gift box") || c.includes("box")) return 450;
  if (c.includes("gift")) return 380;
  if (c.includes("brownie") || c.includes("bite")) return 95;
  if (c.includes("premium")) return 220;
  if (c.includes("stuffed")) return 165;
  if (c.includes("seasonal")) return 175;
  return 149;
}

function englishTitleFromName(name: string, category: string): string {
  if (hasLatin(name) && !hasArabic(name)) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  let en = name;
  const replacements: [RegExp, string][] = [
    [/شوكولاتة|شوكولا/gi, "Chocolate"],
    [/كوكيز|كعك|كوكي/gi, "Cookies"],
    [/براوني|براونيز/gi, "Brownie"],
    [/فستق/gi, "Pistachio"],
    [/لوتس/gi, "Lotus"],
    [/nutella|نوتيلا/gi, "Nutella"],
    [/محشو|محشية/gi, "Stuffed"],
    [/فاخر|فاخرة/gi, "Premium"],
    [/هدية|بوكس|صندوق/gi, "Gift"],
    [/قضمة|قضمات/gi, "Bite"],
    [/موسمية|رمضان|عيد/gi, "Seasonal"],
    [/كلاسيك/gi, "Classic"],
  ];
  for (const [re, word] of replacements) {
    en = en.replace(re, ` ${word} `);
  }
  en = en.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();

  if (hasArabic(en) || en.length < 3) {
    if (category === "Gift Box") return "Luxury Gift Cookie Box";
    if (category === "Gifts") return "Artisan Gift Cookie Collection";
    return `${category} Cookies`;
  }
  return en
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function arabicTitleFromName(name: string): string {
  if (hasArabic(name)) return name.trim();
  return `${name.trim()} — كوكيز Cookie Bite`;
}

function buildDescriptions(name: string, category: string) {
  const enTitle = englishTitleFromName(name, category);
  return {
    description_en: `${enTitle} — handcrafted in small batches with premium ingredients. Fresh-baked daily in New Cairo. Perfect for gifting, celebrations, or everyday indulgence.`,
    description_ar: `${arabicTitleFromName(name)} — كوكيز يدوية الصنع بمكونات مختارة، تُخبز طازجة يومياً في القاهرة الجديدة. مثالية للهدايا والمناسبات والتجمعات.`,
  };
}

function inferBadges(name: string): string {
  const n = (name + "").toLowerCase();
  const badges: string[] = [];
  if (/best|أكثر\s*مبيع|bestseller/i.test(n)) badges.push("bestseller");
  if (/new|جديد|جديدة/i.test(n)) badges.push("new");
  if (/trend|رائج|viral/i.test(n)) badges.push("trending");
  if (badges.length === 0) badges.push("new");
  return badges.join(", ");
}

function inferSeasons(name: string): string {
  const n = name.toLowerCase();
  const seasons: string[] = [];
  if (/ramadan|رمضان/i.test(n)) seasons.push("ramadan");
  if (/eid|عيد/i.test(n)) seasons.push("eid");
  if (/summer|صيف/i.test(n)) seasons.push("summer");
  if (/winter|شتاء/i.test(n)) seasons.push("winter");
  return seasons.join(", ");
}

function inferDietary(category: string): string {
  if (category === "Gift Box" || category === "Gifts") {
    return "Contains gluten, dairy, eggs — gift-ready packaging";
  }
  return "Butter, flour, sugar, eggs, vanilla — may contain nuts";
}

function inferDietaryAr(category: string): string {
  if (category === "Gift Box" || category === "Gifts") {
    return "يحتوي على جلوتين وحليب وبيض — تغليف مناسب للهدايا";
  }
  return "زبدة، دقيق، سكر، بيض، فانيليا — قد يحتوي على مكسرات";
}

function skuFromSlug(slug: string): string {
  const core = slug.replace(/-/g, "").slice(0, 10).toUpperCase();
  return core ? `CB-${core}` : `CB-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

function weightAndPieces(category: string, name: string): {
  weight_grams: string;
  pieces_count: string;
} {
  const n = name.toLowerCase();
  if (category === "Gift Box" || /box|بوكس|صندوق|12|24/i.test(n)) {
    const count = /24|٢٤/.test(n) ? "24" : /6|٦/.test(n) ? "6" : "12";
    return { weight_grams: "480", pieces_count: count };
  }
  if (/brownie|براوني/i.test(n)) return { weight_grams: "95", pieces_count: "1" };
  return { weight_grams: "85", pieces_count: "1" };
}

/** يولّد كل الحقول القابلة للتعبئة (ما عدا الصور والفيديو). */
export function generateProductFieldsFromName(name: string): Partial<ProductFormState> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return {};

  const category = inferCategoryFromName(trimmed);
  const slug = deriveProductSlug(trimmed);
  const price = defaultPriceForCategory(category);
  const { description_en, description_ar } = buildDescriptions(trimmed, category);
  const { weight_grams, pieces_count } = weightAndPieces(category, trimmed);
  const compare = Math.round(price * 1.12);

  return {
    name: trimmed,
    slug,
    title_en: englishTitleFromName(trimmed, category),
    title_ar: arabicTitleFromName(trimmed),
    description_en,
    description_ar,
    ingredients: `${inferDietary(category)}, ${inferDietaryAr(category)}`,
    category,
    sku: skuFromSlug(slug),
    price_egp: String(price),
    compare_price_egp: String(compare),
    stock: category.includes("Gift") ? "12" : "24",
    badges: inferBadges(trimmed),
    seasons: inferSeasons(trimmed),
    weight_grams,
    pieces_count,
    meta_title: trimmed.slice(0, 70),
    meta_description: description_en.slice(0, 160),
    is_active: true,
  };
}
