/**
 * توليد حقول المنتج تلقائياً من الاسم — تحليل الكلمات + عناوين عربية/إنجليزية نقية.
 */

import { DEFAULT_PRODUCT_CATEGORY } from "@/lib/admin/product-categories";
import {
  PRODUCT_BADGE_OPTIONS,
  PRODUCT_SEASON_OPTIONS,
  joinCatalogCsv,
} from "@/lib/products/catalog-options";
import type { ProductFormState } from "@/lib/admin/products-dashboard-types";
import { deriveProductSlug } from "@/lib/products/slug";

/** نسبة سعر المقارنة فوق السعر الفعلي (~12% خصم ظاهر). */
export const COMPARE_PRICE_MARKUP = 1.12;

export function deriveComparePriceFromSalePrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "";
  return String(Math.round(price * COMPARE_PRICE_MARKUP));
}

type Script = "ar" | "en" | "digit" | "other";

export type AnalyzedWord = {
  raw: string;
  script: Script;
  /** normalized lowercase English or Arabic surface form */
  normalized: string;
};

export type ProductTitleAnalysis = {
  raw: string;
  words: AnalyzedWord[];
  englishTokens: string[];
  arabicTokens: string[];
  primaryScript: "ar" | "en" | "mixed";
  category: string;
  flavors: string[];
  isGiftBox: boolean;
  pieceHint: number | null;
};

const EN_TO_AR: Record<string, string> = {
  chocolate: "شوكولاتة",
  choc: "شوكولاتة",
  cookie: "كوكيز",
  cookies: "كوكيز",
  brownie: "براوني",
  brownies: "براونيز",
  bite: "قضمة",
  bites: "قضمات",
  stuffed: "محشية",
  filling: "محشية",
  filled: "محشية",
  pistachio: "فستق",
  lotus: "لوتس",
  nutella: "نوتيلا",
  caramel: "كراميل",
  vanilla: "فانيليا",
  classic: "كلاسيك",
  premium: "فاخرة",
  luxury: "فاخرة",
  signature: "مميزة",
  gift: "هدية",
  box: "علبة",
  collection: "مجموعة",
  seasonal: "موسمية",
  ramadan: "رمضان",
  eid: "عيد",
  valentine: "عيد الحب",
  christmas: "كريسماس",
  mini: "ميني",
  double: "دبل",
  triple: "ثلاثي",
  white: "بيضاء",
  dark: "داكنة",
  milk: "بالحليب",
  hazelnut: "بندق",
  almond: "لوز",
  peanut: "فول سوداني",
  oreo: "أوريو",
  red: "ريد",
  velvet: "فلفت",
  cheesecake: "تشيز كيك",
  new: "جديدة",
  bestseller: "الأكثر مبيعاً",
};

const AR_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_AR).map(([en, ar]) => [ar, en]),
);

// extra Arabic-only keys
Object.assign(AR_TO_EN, {
  شوكولا: "chocolate",
  شوكولاتة: "chocolate",
  كوكيز: "cookies",
  كوكي: "cookie",
  كعك: "cookies",
  براوني: "brownie",
  براونيز: "brownies",
  قضمة: "bite",
  قضمات: "bites",
  محشو: "stuffed",
  محشية: "stuffed",
  فستق: "pistachio",
  لوتس: "lotus",
  نوتيلا: "nutella",
  كراميل: "caramel",
  فانيليا: "vanilla",
  كلاسيك: "classic",
  فاخر: "premium",
  فاخرة: "premium",
  هدية: "gift",
  بوكس: "box",
  صندوق: "box",
  علبة: "box",
  موسمية: "seasonal",
  رمضان: "ramadan",
  عيد: "eid",
  ميني: "mini",
  جديد: "new",
  جديدة: "new",
  "الأكثر مبيعاً": "bestseller",
  "اكثر مبيع": "bestseller",
});

const FLAVOR_EN = new Set([
  "chocolate",
  "pistachio",
  "lotus",
  "nutella",
  "caramel",
  "vanilla",
  "hazelnut",
  "almond",
  "oreo",
  "red",
  "velvet",
]);

function charScript(ch: string): Script {
  if (/[\u0600-\u06FF]/.test(ch)) return "ar";
  if (/[a-zA-Z]/.test(ch)) return "en";
  if (/\d/.test(ch)) return "digit";
  return "other";
}

/** يقسّم النص إلى مقاطع حسب الخط (عربي / لاتيني / أرقام). */
export function splitByScript(text: string): Array<{ text: string; script: Script }> {
  const segments: Array<{ text: string; script: Script }> = [];
  let buf = "";
  let script: Script | null = null;

  for (const ch of text) {
    const s = charScript(ch);
    if (script !== null && s !== "other" && s !== script) {
      if (buf.trim()) segments.push({ text: buf.trim(), script });
      buf = "";
      script = null;
    }
    if (s === "other") {
      buf += ch;
      continue;
    }
    if (script === null) script = s;
    buf += ch;
  }
  if (buf.trim()) segments.push({ text: buf.trim(), script: script ?? "other" });
  return segments;
}

function normalizeEnglishToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function normalizeArabicToken(token: string): string {
  return token.replace(/[^\u0600-\u06FF\s]/g, "").trim();
}

/** يحلّل الاسم إلى كلمات مع تحديد لغة كل كلمة. */
export function analyzeProductTitle(name: string): ProductTitleAnalysis {
  const raw = name.trim();
  const segments = splitByScript(raw);
  const words: AnalyzedWord[] = [];

  for (const seg of segments) {
    if (seg.script === "en") {
      for (const part of seg.text.split(/[\s/|–—-]+/)) {
        const n = normalizeEnglishToken(part);
        if (n.length >= 2) words.push({ raw: part, script: "en", normalized: n });
      }
    } else if (seg.script === "ar") {
      for (const part of seg.text.split(/[\s/|–—-]+/)) {
        const n = normalizeArabicToken(part);
        if (n.length >= 2) words.push({ raw: part, script: "ar", normalized: n });
      }
    } else if (seg.script === "digit") {
      words.push({ raw: seg.text, script: "digit", normalized: seg.text });
    }
  }

  const englishTokens: string[] = [];
  const arabicTokens: string[] = [];

  for (const w of words) {
    if (w.script === "en") {
      englishTokens.push(w.normalized);
    } else if (w.script === "ar") {
      arabicTokens.push(w.normalized);
    } else if (w.script === "digit") {
      englishTokens.push(w.normalized);
      arabicTokens.push(w.normalized);
    }
  }

  // كلمات إنجليزية مترجمة من العربية والعكس — لملء الفجوات
  for (const ar of [...arabicTokens]) {
    const en = AR_TO_EN[ar];
    if (en && !englishTokens.includes(en)) englishTokens.push(en);
  }
  for (const en of [...englishTokens]) {
    const ar = EN_TO_AR[en];
    if (ar && !arabicTokens.includes(ar)) arabicTokens.push(ar);
  }

  const hasAr = arabicTokens.length > 0 || segments.some((s) => s.script === "ar");
  const hasEn = englishTokens.length > 0 || segments.some((s) => s.script === "en");
  const primaryScript: ProductTitleAnalysis["primaryScript"] =
    hasAr && hasEn ? "mixed" : hasAr ? "ar" : "en";

  const joined = raw.toLowerCase() + raw;
  const category = inferCategoryFromName(raw);
  const flavors = englishTokens.filter((t) => FLAVOR_EN.has(t));
  const isGiftBox = /gift\s*box|بوكس|صندوق|علبة|box/i.test(joined);

  let pieceHint: number | null = null;
  const countMatch = raw.match(/\b(6|12|24|٦|١٢|٢٤)\b/);
  if (countMatch) pieceHint = Number(countMatch[1].replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()));

  return {
    raw,
    words,
    englishTokens,
    arabicTokens,
    primaryScript,
    category,
    flavors,
    isGiftBox,
    pieceHint,
  };
}

function titleCaseEn(words: string[]): string {
  return words
    .filter(Boolean)
    .map((w) => {
      if (/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** عنوان إنجليزي نقي — بدون أي حرف عربي. */
export function buildPureEnglishTitle(analysis: ProductTitleAnalysis): string {
  const { englishTokens, category, isGiftBox, flavors } = analysis;

  const ordered: string[] = [];
  const pushUnique = (w: string) => {
    const n = w.toLowerCase();
    if (!ordered.some((x) => x.toLowerCase() === n)) ordered.push(w);
  };

  if (flavors.includes("red") && englishTokens.includes("velvet")) {
    pushUnique("red velvet");
  }

  for (const t of englishTokens) {
    if (t === "red" || t === "velvet") continue;
    if (FLAVOR_EN.has(t)) pushUnique(t);
  }

  for (const t of englishTokens) {
    if (FLAVOR_EN.has(t) || t === "red" || t === "velvet") continue;
    if (["cookies", "cookie", "brownie", "brownies", "bite", "bites"].includes(t)) continue;
    if (["gift", "box", "collection"].includes(t)) continue;
    pushUnique(t);
  }

  const hasCookieWord = englishTokens.some((t) =>
    ["cookies", "cookie", "brownie", "brownies", "bite", "bites"].includes(t),
  );

  if (englishTokens.includes("brownie") || englishTokens.includes("brownies")) {
    pushUnique("Brownie");
  } else if (englishTokens.includes("bite") || englishTokens.includes("bites")) {
    pushUnique("Bites");
  } else if (hasCookieWord || ordered.length > 0) {
    pushUnique("Cookies");
  }

  if (isGiftBox || (englishTokens.includes("gift") && englishTokens.includes("box"))) {
    pushUnique("Gift Box");
  } else if (englishTokens.includes("gift")) {
    pushUnique("Gift Collection");
  }

  if (ordered.length === 0) {
    if (category === "Gift Box") return "Luxury Cookie Gift Box";
    if (category === "Gifts") return "Artisan Cookie Gift Collection";
    if (category === "Brownie" || category.includes("Bite")) return `${category} Treat`;
    return `${category} Cookies`;
  }

  return titleCaseEn(ordered);
}

/** عنوان عربي نقي — بدون أي حرف لاتيني. */
export function buildPureArabicTitle(analysis: ProductTitleAnalysis): string {
  const { arabicTokens, category, isGiftBox } = analysis;

  const ordered: string[] = [];
  const pushUnique = (w: string) => {
    if (!ordered.includes(w)) ordered.push(w);
  };

  const flavorAr = new Set([
    "شوكولاتة",
    "فستق",
    "لوتس",
    "نوتيلا",
    "كراميل",
    "فانيليا",
    "بندق",
    "لوز",
    "أوريو",
  ]);

  for (const t of arabicTokens) {
    if (flavorAr.has(t)) pushUnique(t);
  }

  for (const t of arabicTokens) {
    if (flavorAr.has(t)) continue;
    if (["كوكيز", "كوكي", "كعك", "براوني", "براونيز", "قضمة", "قضمات"].includes(t)) continue;
    if (["هدية", "بوكس", "صندوق", "علبة"].includes(t)) continue;
    pushUnique(t);
  }

  const hasCookieWord = arabicTokens.some((t) =>
    ["كوكيز", "كوكي", "كعك", "براوني", "براونيز", "قضمة", "قضمات"].includes(t),
  );

  if (arabicTokens.includes("براوني") || arabicTokens.includes("براونيز")) {
    pushUnique("براوني");
  } else if (arabicTokens.includes("قضمة") || arabicTokens.includes("قضمات")) {
    pushUnique("قضمات");
  } else if (hasCookieWord || ordered.length > 0) {
    pushUnique("كوكيز");
  }

  if (isGiftBox) {
    pushUnique("علبة هدايا");
  } else if (arabicTokens.includes("هدية")) {
    pushUnique("مجموعة هدايا");
  }

  if (ordered.length === 0) {
    if (category === "Gift Box") return "علبة هدايا كوكيز فاخرة";
    if (category === "Gifts") return "مجموعة كوكيز للهدايا";
    if (category === "Stuffed") return "كوكيز محشية";
    if (category === "Chocolate Lovers") return "كوكيز شوكولاتة";
    if (category === "Premium") return "كوكيز فاخرة";
    return "كوكيز فاخرة";
  }

  return ordered.join(" ");
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

function buildDescriptions(analysis: ProductTitleAnalysis, titleEn: string, titleAr: string) {
  const flavorHint =
    analysis.flavors.length > 0
      ? ` Featuring ${analysis.flavors.join(", ")}.`
      : "";
  const flavorHintAr =
    analysis.arabicTokens.filter((t) =>
      ["شوكولاتة", "فستق", "لوتس", "نوتيلا", "كراميل"].includes(t),
    ).length > 0
      ? " بنكهة غنية ومميزة."
      : "";

  return {
    description_en: `${titleEn} — handcrafted in small batches with premium ingredients.${flavorHint} Fresh-baked daily in New Cairo. Perfect for gifting, celebrations, or everyday indulgence.`,
    description_ar: `${titleAr} — كوكيز يدوية الصنع بمكونات مختارة.${flavorHintAr} تُخبز طازجة يومياً في القاهرة الجديدة. مثالية للهدايا والمناسبات والتجمعات.`,
  };
}

function inferBadges(name: string): string {
  const n = (name + "").toLowerCase();
  const badges: string[] = [];
  if (/best|أكثر\s*مبيع|bestseller/i.test(n)) badges.push("bestseller");
  if (/new|جديد|جديدة/i.test(n)) badges.push("new");
  if (/trend|رائج|viral/i.test(n)) badges.push("trending");
  if (/featured|مميز/i.test(n)) badges.push("featured");
  if (badges.length === 0) badges.push("new");
  return joinCatalogCsv(badges.filter((b) => PRODUCT_BADGE_OPTIONS.some((o) => o.value === b)));
}

function inferSeasons(name: string): string {
  const n = name.toLowerCase();
  const seasons: string[] = [];
  if (/ramadan|رمضان/i.test(n)) seasons.push("ramadan");
  if (/eid|عيد/i.test(n)) seasons.push("eid");
  if (/summer|صيف/i.test(n)) seasons.push("summer");
  if (/winter|شتاء/i.test(n)) seasons.push("winter");
  if (/spring|ربيع/i.test(n)) seasons.push("spring");
  if (/valentine|حب/i.test(n)) seasons.push("valentine");
  if (/christmas|كريسماس/i.test(n)) seasons.push("christmas");
  return joinCatalogCsv(seasons.filter((s) => PRODUCT_SEASON_OPTIONS.some((o) => o.value === s)));
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

function weightAndPieces(category: string, analysis: ProductTitleAnalysis): {
  weight_grams: string;
  pieces_count: string;
} {
  if (category === "Gift Box" || analysis.isGiftBox) {
    const count = analysis.pieceHint ? String(analysis.pieceHint) : "12";
    return { weight_grams: "480", pieces_count: count };
  }
  if (analysis.englishTokens.some((t) => ["brownie", "brownies"].includes(t))) {
    return { weight_grams: "95", pieces_count: "1" };
  }
  return { weight_grams: "85", pieces_count: "1" };
}

export type GeneratedProductFields = Partial<ProductFormState>;

/** يولّد كل الحقول من تحليل الاسم (فوري — بدون شبكة). */
export function generateProductFieldsFromName(name: string): GeneratedProductFields {
  const trimmed = name.trim();
  if (trimmed.length < 2) return {};

  const analysis = analyzeProductTitle(trimmed);
  const category = analysis.category;
  const title_en = buildPureEnglishTitle(analysis);
  const title_ar = buildPureArabicTitle(analysis);
  const slug = deriveProductSlug(title_en || trimmed);
  const price = defaultPriceForCategory(category);
  const { description_en, description_ar } = buildDescriptions(analysis, title_en, title_ar);
  const { weight_grams, pieces_count } = weightAndPieces(category, analysis);
  const compare_price_egp = deriveComparePriceFromSalePrice(price);

  return {
    name: trimmed,
    slug,
    title_en,
    title_ar,
    description_en,
    description_ar,
    ingredients: `${inferDietary(category)}, ${inferDietaryAr(category)}`,
    category,
    sku: skuFromSlug(slug),
    price_egp: String(price),
    compare_price_egp,
    stock: category.includes("Gift") ? "12" : "24",
    badges: inferBadges(trimmed),
    seasons: inferSeasons(trimmed),
    weight_grams,
    pieces_count,
    meta_title: title_en.slice(0, 70),
    meta_description: description_en.slice(0, 160),
    is_active: true,
  };
}

/** دمج حقول مُولَّدة من AI مع الحقول المحلية (AI يغلّب العناوين والوصف فقط). */
export function mergeAiProductFields(
  local: GeneratedProductFields,
  ai: Partial<ProductFormState>,
): GeneratedProductFields {
  const pick = (key: keyof ProductFormState) => {
    const v = ai[key];
    if (v === undefined || v === null) return local[key];
    if (typeof v === "string" && !v.trim()) return local[key];
    return v;
  };

  return {
    ...local,
    title_en: pick("title_en") as string,
    title_ar: pick("title_ar") as string,
    description_en: pick("description_en") as string,
    description_ar: pick("description_ar") as string,
    category: pick("category") as string,
    badges: pick("badges") as string,
    seasons: pick("seasons") as string,
    ingredients: pick("ingredients") as string,
    meta_title: (pick("meta_title") as string) || local.meta_title,
    meta_description: (pick("meta_description") as string) || local.meta_description,
  };
}
