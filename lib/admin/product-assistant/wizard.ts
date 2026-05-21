import { z } from "zod";
import { deriveProductSlug } from "@/lib/products/slug";

export const WIZARD_STEPS = [
  "idle",
  "name",
  "images",
  "category",
  "price",
  "stock",
  "description",
  "review",
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number];

export const productWizardDraftSchema = z.object({
  name: z.string().max(160).optional(),
  image_url: z.string().url().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  price_egp: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  description_en: z.string().max(3000).nullable().optional(),
  sku: z.string().max(80).nullable().optional(),
  dietary: z.array(z.string().max(120)).max(30).optional(),
  title_en: z.string().max(160).nullable().optional(),
  title_ar: z.string().max(160).nullable().optional(),
});

export type ProductWizardDraft = z.infer<typeof productWizardDraftSchema>;

export type ProductWizardState = {
  active: boolean;
  step: WizardStep;
  draft: ProductWizardDraft;
  /** آخر وصف عُيِّن عبر Gemini في هذه الجلسة */
  descriptionFromAi?: boolean;
};

/** معاينة تسويقية / SEO — للعرض أو التصدير (الكتالوج يستخدم `compiledPayload` منفصلاً) */
export type ProductMarketingPreviewJson = {
  name: string;
  slug: string;
  price: number;
  currency: "EGP";
  category: string;
  stock: number;
  sku: string;
  description: string;
  short_description: string;
  features: string[];
  tags: string[];
  images: string[];
  generated: {
    description: boolean;
    images: boolean;
  };
};

function shortFromDescription(text: string, max = 220): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim() + "…";
}

function featureBulletsFromDescription(desc: string, name: string, category: string): string[] {
  const raw = desc
    .split(/(?:\n+|\.(?:\s+|$))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 200);
  const uniq = [...new Set(raw)].slice(0, 5);
  if (uniq.length >= 2) return uniq;
  const cat = category || "handcrafted treats";
  return [
    `Premium ${name} — ${cat}.`,
    "Baked with quality ingredients; perfect for gifting or everyday indulgence.",
    "From Cookie Bite — New Cairo.",
  ];
}

function tagsFromNameCategory(name: string, category: string): string[] {
  const blob = `${name} ${category}`.toLowerCase();
  const words = blob
    .split(/[^a-z0-9\u0600-\u06FF]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && w.length < 32);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= 12) break;
  }
  return out.length ? out : ["cookie-bite", "dessert", "cairo"];
}

export function buildMarketingPreview(params: {
  draft: ProductWizardDraft;
  sku: string;
  descriptionFromAi: boolean;
}): ProductMarketingPreviewJson {
  const name = params.draft.name?.trim() ?? "";
  const price = params.draft.price_egp ?? 0;
  const category = params.draft.category?.trim() ?? "";
  const stock = params.draft.stock ?? 0;
  const desc = (params.draft.description_en ?? "").trim();
  const slug = deriveProductSlug(name);
  const img = params.draft.image_url;
  const images = typeof img === "string" && img.length > 0 ? [img] : [];

  return {
    name,
    slug,
    price,
    currency: "EGP",
    category: category || "General",
    stock,
    sku: params.sku,
    description: desc,
    short_description: desc ? shortFromDescription(desc) : shortFromDescription(`${name} — ${category}.`, 180),
    features: featureBulletsFromDescription(desc, name, category),
    tags: tagsFromNameCategory(name, category),
    images,
    generated: {
      description: params.descriptionFromAi,
      images: false,
    },
  };
}

const CREATE_INTENT =
  /\b(add\s+product|create\s+(new\s+)?(item|product)|new\s+product|إضافة\s+منتج|أضف\s+منتج|منتج\s+جديد|إنشاء\s+منتج)\b/i;

const AUTO_WORDS =
  /\b(you\s+decide|auto|generate|توليد|قرر\s+أنت|اقترح|اقتراح|اكتب\s+أنت|ولِّد)\b/i;

const SKIP_WORDS = /\b(skip|none|no\s+image|بدون|تخطي|لا\s+صورة)\b/i;

export function detectCreateProductIntent(text: string): boolean {
  return CREATE_INTENT.test(text.trim());
}

export function userWantsAuto(text: string): boolean {
  return AUTO_WORDS.test(text.trim());
}

export function userSkipsImage(text: string): boolean {
  return SKIP_WORDS.test(text.trim());
}

const URL_RE = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

export function extractUrls(text: string): string[] {
  const m = text.match(URL_RE);
  return m ?? [];
}

export function parsePriceEgp(text: string): number | null {
  const t = text.replace(/,/g, ".").trim();
  const num = t.match(/(\d+(?:\.\d+)?)/);
  if (!num) return null;
  const v = Number(num[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function parseStock(text: string): number | null {
  const t = text.trim();
  const m = t.match(/\b(\d{1,6})\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
}

function mergeDraft(
  draft: ProductWizardDraft,
  patch: Partial<ProductWizardDraft>,
): ProductWizardDraft {
  return { ...draft, ...patch };
}

function nextMissingStep(d: ProductWizardDraft): WizardStep {
  if (!d.name?.trim()) return "name";
  if (d.image_url === undefined) return "images";
  if (!d.category?.trim()) return "category";
  if (d.price_egp == null || !Number.isFinite(d.price_egp)) return "price";
  if (d.stock == null || !Number.isFinite(d.stock)) return "stock";
  if (d.description_en === undefined) return "description";
  return "review";
}

/** يحاول استخراج عدة حقول من رسالة واحدة */
export function parseLooseFields(
  text: string,
  draft: ProductWizardDraft,
): Partial<ProductWizardDraft> {
  void draft;
  const patch: Partial<ProductWizardDraft> = {};
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const kv = line.match(/^([^:=]+)[:=]\s*(.+)$/);
    if (kv) {
      const key = kv[1].trim().toLowerCase();
      const val = kv[2].trim();
      if (key.includes("name") || key.includes("اسم")) patch.name = val.slice(0, 160);
      if (key.includes("category") || key.includes("تصنيف") || key.includes("فئة"))
        patch.category = val.slice(0, 100);
      if (key.includes("price") || key.includes("سعر")) {
        const p = parsePriceEgp(val);
        if (p != null) patch.price_egp = p;
      }
      if (key.includes("stock") || key.includes("quantity") || key.includes("كمية") || key.includes("مخزون")) {
        const s = parseStock(val);
        if (s != null) patch.stock = s;
      }
      if (key.includes("image") || key.includes("url") || key.includes("صورة")) {
        const urls = extractUrls(val);
        if (urls[0]) patch.image_url = urls[0];
      }
      if (key.includes("desc") || key.includes("وصف")) patch.description_en = val.slice(0, 3000);
    }
  }
  const urls = extractUrls(text);
  if (!patch.image_url && urls[0]) patch.image_url = urls[0];
  if (!patch.price_egp) {
    const p = parsePriceEgp(text);
    if (p != null) patch.price_egp = p;
  }
  if (patch.stock === undefined) {
    const s = parseStock(text);
    if (s != null && text.split(/\s+/).length <= 8) patch.stock = s;
  }
  if (!patch.name && lines.length === 1 && !text.includes("http") && parsePriceEgp(text) == null) {
    patch.name = text.trim().slice(0, 160);
  }
  return patch;
}

const STEP_ORDER: WizardStep[] = [
  "name",
  "images",
  "category",
  "price",
  "stock",
  "description",
  "review",
];

function promptFor(step: WizardStep): string {
  switch (step) {
    case "name":
      return "ما **اسم المنتج**؟ (يمكنك إرسال عدة حقول في رسالة واحدة، مثلاً: الاسم: … السعر: …)";
    case "images":
      return "أرسل **رابط صورة** واحدة (HTTPS) للغلاف، أو اكتب «بدون» لتخطي الصورة الآن.";
    case "category":
      return "ما **التصنيف**؟ (مثلاً: كوكيز، هدايا، براونيز)";
    case "price":
      return "ما **السعر بالجنيه المصري**؟ (رقم فقط أو مع كلمة جنيه)";
    case "stock":
      return "ما **المخزون المتاح**؟ (عدد صحيح، يمكن 0)";
    case "description":
      return "اكتب **وصفاً قصيراً** للمنتج، أو اكتب «توليد» لأقترح وصفاً تسويقياً بالإنجليزية (يتطلب مفتاح Gemini).";
    case "review":
      return "راجع البيانات في الملخص ثم اضغط «إنشاء في الكتالوج».";
    default:
      return "";
  }
}

export type WizardTurnResult = {
  reply: string;
  wizard: ProductWizardState;
  requestGeminiDescription: boolean;
  compiledPayload: Record<string, unknown> | null;
  marketingPreview: ProductMarketingPreviewJson | null;
};

export function runWizardTurn(params: {
  userMessage: string;
  wizard: ProductWizardState;
  injectedDescription?: string | null;
}): WizardTurnResult {
  const raw = params.userMessage.trim();
  let { active, step, draft, descriptionFromAi = false } = params.wizard;

  if (!active) {
    if (detectCreateProductIntent(raw)) {
      active = true;
      step = "name";
      draft = {};
      descriptionFromAi = false;
      return {
        reply: `تم — لننشئ منتجاً خطوة بخطوة.\n\n${promptFor("name")}`,
        wizard: { active, step, draft, descriptionFromAi },
        requestGeminiDescription: false,
        compiledPayload: null,
        marketingPreview: null,
      };
    }
    return {
      reply:
        "يمكنني مساعدتك في **إنشاء منتج** محادثةً. اكتب مثلاً: «أضف منتجاً» أو «create new product» للبدء.",
      wizard: { active: false, step: "idle", draft: {}, descriptionFromAi: false },
      requestGeminiDescription: false,
      compiledPayload: null,
      marketingPreview: null,
    };
  }

  if (params.injectedDescription != null) {
    draft = mergeDraft(draft, { description_en: params.injectedDescription });
    descriptionFromAi = true;
    step = nextMissingStep(draft);
    if (step === "review") {
      return finishReview(draft, descriptionFromAi);
    }
    return {
      reply: `تم توليد الوصف.\n\n${promptFor(step)}`,
      wizard: { active: true, step, draft, descriptionFromAi },
      requestGeminiDescription: false,
      compiledPayload: null,
      marketingPreview: null,
    };
  }

  const incomingStep = step;
  const loose = parseLooseFields(raw, draft);
  draft = mergeDraft(draft, loose);
  if (loose.description_en !== undefined) descriptionFromAi = false;

  /** نعالج فقط الخطوة الحالية حتى لا نطلب صورة من رسالة كانت جواباً عن الاسم فقط */
  if (incomingStep === "name") {
    if (!draft.name?.trim() && raw.length > 0) {
      draft = mergeDraft(draft, { name: raw.slice(0, 160) });
    }
    if (!draft.name?.trim()) {
      return {
        reply: "أحتاج **اسماً واضحاً** للمنتج (سطر واحد أو مثلاً: الاسم: …).",
        wizard: { active: true, step: "name", draft, descriptionFromAi },
        requestGeminiDescription: false,
        compiledPayload: null,
        marketingPreview: null,
      };
    }
  } else if (incomingStep === "images") {
    if (draft.image_url !== undefined) {
      /* filled by loose */
    } else if (userSkipsImage(raw)) {
      draft = mergeDraft(draft, { image_url: null });
    } else {
      const urls = extractUrls(raw);
      if (urls[0]) draft = mergeDraft(draft, { image_url: urls[0] });
      else if (raw.length > 0) {
        return {
          reply: "لم أجد رابط صورة صالحاً (HTTPS). الصق الرابط أو اكتب «بدون».",
          wizard: { active: true, step: "images", draft, descriptionFromAi },
          requestGeminiDescription: false,
          compiledPayload: null,
          marketingPreview: null,
        };
      }
    }
  } else if (incomingStep === "category") {
    if (!draft.category?.trim() && raw.length > 0) {
      draft = mergeDraft(draft, { category: raw.slice(0, 100) });
    }
    if (!draft.category?.trim()) {
      return {
        reply: "ما **التصنيف**؟ (مثلاً كوكيز، هدايا، مشروبات)",
        wizard: { active: true, step: "category", draft, descriptionFromAi },
        requestGeminiDescription: false,
        compiledPayload: null,
        marketingPreview: null,
      };
    }
  } else if (incomingStep === "price") {
    if (draft.price_egp == null || !Number.isFinite(draft.price_egp)) {
      const p = parsePriceEgp(raw);
      if (p == null) {
        return {
          reply: "لم أفهم السعر. أرسل رقماً مثل **85** أو **120 جنيه**.",
          wizard: { active: true, step: "price", draft, descriptionFromAi },
          requestGeminiDescription: false,
          compiledPayload: null,
          marketingPreview: null,
        };
      }
      draft = mergeDraft(draft, { price_egp: p });
    }
  } else if (incomingStep === "stock") {
    if (draft.stock == null || !Number.isFinite(draft.stock)) {
      const s = parseStock(raw);
      if (s == null) {
        return {
          reply: "أرسل **عدداً صحيحاً** للمخزون (مثلاً 24 أو 0).",
          wizard: { active: true, step: "stock", draft, descriptionFromAi },
          requestGeminiDescription: false,
          compiledPayload: null,
          marketingPreview: null,
        };
      }
      draft = mergeDraft(draft, { stock: s });
    }
  } else if (incomingStep === "description") {
    if (userWantsAuto(raw)) {
      return {
        reply: "جاري تجهيز وصف تسويقي…",
        wizard: { active: true, step: "description", draft, descriptionFromAi },
        requestGeminiDescription: true,
        compiledPayload: null,
        marketingPreview: null,
      };
    }
    if (raw.length > 0) draft = mergeDraft(draft, { description_en: raw.slice(0, 3000) });
    else draft = mergeDraft(draft, { description_en: null });
    descriptionFromAi = false;
  }

  step = nextMissingStep(draft);

  if (step === "review") {
    return finishReview(draft, descriptionFromAi);
  }

  const idx = STEP_ORDER.indexOf(step);
  const safeStep = idx >= 0 ? step : "name";
  return {
    reply: promptFor(safeStep),
    wizard: { active: true, step: safeStep, draft, descriptionFromAi },
    requestGeminiDescription: false,
    compiledPayload: null,
    marketingPreview: null,
  };
}

function finishReview(draft: ProductWizardDraft, descriptionFromAi: boolean): WizardTurnResult {
  const name = draft.name?.trim();
  const price = draft.price_egp;
  if (!name || price == null) {
    const s = nextMissingStep(draft);
    return {
      reply: `ناقص: ${!name ? "الاسم " : ""}${price == null ? "السعر " : ""}.\n\n${promptFor(s)}`,
      wizard: { active: true, step: s, draft, descriptionFromAi },
      requestGeminiDescription: false,
      compiledPayload: null,
      marketingPreview: null,
    };
  }

  const sku =
    draft.sku?.trim() ||
    `SKU-${Date.now().toString(36).toUpperCase().slice(-10)}${Math.random().toString(36).slice(2, 5)}`;

  const dietary = draft.dietary?.length
    ? draft.dietary
    : ["Cookie Bite", "New Cairo", (draft.category ?? "cookies").slice(0, 40)];

  const compiled: Record<string, unknown> = {
    name,
    sku,
    price_egp: price,
    stock: draft.stock ?? 0,
    category: draft.category?.trim() || null,
    image_url: draft.image_url ?? null,
    description_en: draft.description_en ?? null,
    description_ar: null,
    description: draft.description_en ?? null,
    title_en: draft.title_en ?? name,
    title_ar: draft.title_ar ?? null,
    dietary,
    is_active: true,
  };

  const summary = [
    `**الاسم:** ${name}`,
    `**السعر:** ${price} ج.م`,
    `**المخزون:** ${draft.stock ?? 0}`,
    `**التصنيف:** ${draft.category ?? "—"}`,
    `**SKU:** ${sku}`,
    `**الصورة:** ${draft.image_url ?? "بدون"}`,
  ].join("\n");

  const marketingPreview = buildMarketingPreview({
    draft,
    sku,
    descriptionFromAi,
  });

  return {
    reply: `اكتملت البيانات:\n${summary}\n\nمعاينة JSON للتسويق متاحة أسفل المحادثة. اضغط **إنشاء في الكتالوج** لحفظ المنتج، أو أعد إرسال الحقول الناقصة إن لزم.`,
    wizard: { active: true, step: "review", draft, descriptionFromAi },
    requestGeminiDescription: false,
    compiledPayload: compiled,
    marketingPreview,
  };
}

export function resetWizard(): ProductWizardState {
  return { active: false, step: "idle", draft: {}, descriptionFromAi: false };
}
