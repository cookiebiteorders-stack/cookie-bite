import type { TrainingIntent } from "@/lib/mr-brownie/training/types";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";

export type DetectedLanguage = "ar" | "en" | "mixed";

export type MessageEntities = {
  budget_egp: number | null;
  urgency: boolean;
  occasion: string | null;
  dietary: string[];
  quantity_hint: number | null;
  order_number: string | null;
  promo_code: string | null;
  product_keywords: string[];
  wants_recommendation: boolean;
  wants_comparison: boolean;
};

export type MessageUnderstanding = {
  raw: string;
  normalized: string;
  detected_language: DetectedLanguage;
  entities: MessageEntities;
  intent_scores: Array<{ intent: TrainingIntent; score: number }>;
  top_intent: TrainingIntent;
  confidence_pct: number;
  ambiguity: boolean;
  context_note: string | null;
  understanding_hint: string;
};

type IntentSignal = {
  intent: TrainingIntent;
  patterns: RegExp[];
  weight: number;
};

/** أنماط موسّعة — عربي فصيح/مصري + إنجليزي */
const INTENT_SIGNALS: IntentSignal[] = [
  {
    intent: "gift_request",
    weight: 3,
    patterns: [
      /هدي|هدية|هدايا|بوكس|صندوق|gift|present|surprise|occasion|مناسبة|عيد ميلاد|birthday|زفاف|خطوبة|wedding|corporate gift|هدية ل/i,
      /عايز\s+(اهدي|أهدي)|محتاج\s+هدية|something\s+for\s+(her|him|them)/i,
    ],
  },
  {
    intent: "delivery_faq",
    weight: 3,
    patterns: [
      /توصيل|شحن|delivery|deliver|ship|when.*arrive|متى\s+(يوصل|يوصل)|يوم\s+(التوصيل|الشحن)|same.?day|next.?day/i,
      /بيوصل\s+(امتى|إمتى|when)|منطقة\s+التوصيل|delivery\s+area|shipping\s+fee|رسوم\s+الشحن|مجاني/i,
    ],
  },
  {
    intent: "complaint",
    weight: 4,
    patterns: [
      /مشكلة|مش\s+كويس|بايظ|تالف|غلط|return|refund|شكوى|استرجاع|مسترجع|وصل.*(بايظ|تالف|مكسور)|متضرر|disappointed|terrible|wrong order|late order/i,
      /الطلب\s+(غلط|ناقص|متأخر)|ما\s+وصل|ماوصل|not\s+received|damaged|broken/i,
    ],
  },
  {
    intent: "order_status",
    weight: 3,
    patterns: [
      /فين\s+(ال)?(أوردر|اوردر|طلب)|أين\s+الطلب|track.*order|order status|حالة\s+الطلب|وين\s+طلبي|follow\s+up\s+order/i,
      /رقم\s+الطلب|order\s+#|tracking/i,
    ],
  },
  {
    intent: "cart_help",
    weight: 3,
    patterns: [
      /سلة|السلة|cart|checkout|الدفع|payment|promo\s+code|كود\s+الخصم|أكمل\s+الطلب|complete\s+order/i,
      /عندي\s+في\s+السلة|في\s+الcart|before\s+pay/i,
    ],
  },
  {
    intent: "pairing",
    weight: 2,
    patterns: [
      /قهوة|coffee|tea|شاي|مشروب|drink|pair|pairing|يناسب\s+مع|goes\s+with|مع\s+(القهوة|الشاي)/i,
      /حاجة\s+مع\s+القهوة|something\s+with\s+coffee/i,
    ],
  },
  {
    intent: "budget",
    weight: 2,
    patterns: [
      /جنيه|ج\.?\s*م|egp|pound|ميزانية|budget|under\s+\d+|أقل\s+من|اقل\s+من|cheap|رخيص|اقتصاد|سعر|price|بكام|كام\s+ال|how\s+much/i,
      /\d{2,5}\s*(جنيه|egp)/i,
    ],
  },
  {
    intent: "product_browse",
    weight: 2,
    patterns: [
      /كوكيز|cookie|cookies|براوني|brownie|شوكولات|chocolate|منتج|product|shop|flavor|نكه|أحسن|احسن|best|popular|مبيع|تشكيل|menu/i,
      /عايز\s+(اكل|آكل|حاجة|حاجه)|recommend|رشح|رشّح|suggest|ايه\s+احسن|إيه\s+أحسن|what\s+should/i,
    ],
  },
  {
    intent: "greeting",
    weight: 2,
    patterns: [
      /^(مرحب|مرحبا|أهلا|اهلا|هلا|السلام|hello|hi|hey|good\s+(morning|evening))\b/i,
      /^(ازيك|إزيك|عامل\s+ايه|كيف\s+حال)/i,
    ],
  },
];

const AFFIRMATION_RE =
  /^(yes|yeah|yep|ok|okay|sure|please|yup|اه|ايوه|أيوه|تمام|ماشي|موافق|نعم|حاضر|يلا|اوك|ok|yalla|تمام\s+كده|ماشى)$/i;

const FOLLOW_UP_RE =
  /^(كمان|برضه|بردو|also|and|more|طيب|تمام\s+و|yes\s+and|ايه\s+كمان|إيه\s+كمان)/i;

const OCCASION_PATTERNS: Array<{ key: string; re: RegExp }> = [
  { key: "birthday", re: /عيد\s+ميلاد|birthday|bday/i },
  { key: "wedding", re: /زفاف|فرح|wedding|engagement|خطوبة/i },
  { key: "eid", re: /عيد\s+(فطر|أضحى|الفطر|الأضحى)|eid/i },
  { key: "corporate", re: /شركة|corporate|team|staff|موظف/i },
  { key: "thank_you", re: /شكر|thank\s*you|تقدير/i },
  { key: "graduation", re: /graduation|تخرج/i },
];

const DIETARY_PATTERNS: Array<{ tag: string; re: RegExp }> = [
  { tag: "nut_free", re: /nut.?free|بدون\s+مكسرات|خالي\s+من\s+المكسرات|no\s+nuts/i },
  { tag: "gluten_free", re: /gluten.?free|بدون\s+جلوتين/i },
  { tag: "vegan", re: /vegan|نباتي/i },
];

export function normalizeMessage(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\S\n]+/g, " ")
    .trim()
    .toLowerCase();
}

export function detectLanguage(text: string): DetectedLanguage {
  const ar = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const en = (text.match(/[a-z]/gi) ?? []).length;
  if (ar > 0 && en > 0) return "mixed";
  if (ar > en) return "ar";
  if (en > 0) return "en";
  return "mixed";
}

export function extractMessageEntities(raw: string, normalized: string): MessageEntities {
  const budgetMatch =
    raw.match(/(\d{2,5})\s*(?:جنيه|ج\.?\s*م|egp|pounds?)/i) ??
    raw.match(/(?:under|أقل\s+من|اقل\s+من|below)\s*(\d{2,5})/i) ??
    raw.match(/(?:بكام|كام\s+السعر|how\s+much).{0,20}(\d{2,5})/i);

  const orderMatch =
    raw.match(/\b(?:order|طلب)\s*#?\s*([A-Z0-9-]{4,20})\b/i) ??
    raw.match(/\b(CB-[A-Z0-9-]{4,})\b/i);

  const promoMatch =
    raw.match(
      /\b(?:كود|كوبون|promo|code|coupon)(?:\s+\S+){0,2}\s*([A-Za-z0-9]{4,24})\b/i,
    ) ?? raw.match(/\b([A-Z][A-Z0-9]{3,15})\b/);

  const qtyMatch = raw.match(/\b(\d{1,2})\s*(?:box|boxes|صندوق|صناديق|قطعة|pieces?|pcs)\b/i);

  const productKeywords: string[] = [];
  for (const kw of [
    "brownie",
    "cookie",
    "chocolate",
    "gift",
    "box",
    "براوني",
    "كوكيز",
    "شوكولات",
    "هدية",
    "صندوق",
  ]) {
    if (normalized.includes(kw) || raw.toLowerCase().includes(kw)) {
      productKeywords.push(kw);
    }
  }

  let occasion: string | null = null;
  for (const o of OCCASION_PATTERNS) {
    if (o.re.test(raw)) {
      occasion = o.key;
      break;
    }
  }

  const dietary: string[] = [];
  for (const d of DIETARY_PATTERNS) {
    if (d.re.test(raw)) dietary.push(d.tag);
  }

  return {
    budget_egp: budgetMatch ? Number(budgetMatch[1]) : null,
    urgency: /بسرعة|سريع|دلوقتي|urgent|asap|fast|today|النهارده|النهاردة/i.test(raw),
    occasion,
    dietary,
    quantity_hint: qtyMatch ? Number(qtyMatch[1]) : null,
    order_number: orderMatch?.[1]?.toUpperCase() ?? null,
    promo_code: promoMatch?.[1]?.toUpperCase() ?? null,
    product_keywords: [...new Set(productKeywords)],
    wants_recommendation: /رشح|رشّح|recommend|suggest|اختار|اختارلي|pick\s+for|help\s+me\s+choose|عايز\s+حاجة/i.test(
      raw,
    ),
    wants_comparison: /قارن|compare|vs|ولا|or\s+between|أيه\s+احسن|إيه\s+أحسن|which\s+is\s+better/i.test(
      raw,
    ),
  };
}

function scoreIntents(normalized: string, raw: string): Array<{ intent: TrainingIntent; score: number }> {
  const scores = new Map<TrainingIntent, number>();

  for (const signal of INTENT_SIGNALS) {
    for (const pattern of signal.patterns) {
      if (pattern.test(normalized) || pattern.test(raw)) {
        scores.set(signal.intent, (scores.get(signal.intent) ?? 0) + signal.weight);
      }
    }
  }

  if (/كود|كوبون|promo|coupon|discount\s*code/i.test(raw)) {
    scores.set("cart_help", (scores.get("cart_help") ?? 0) + 3);
  }

  if (/فين|ازاي|كيف|where|how to|رابط|صفحة|link to/i.test(raw)) {
    scores.set("general", (scores.get("general") ?? 0) + 1);
  }

  const ranked = [...scores.entries()]
    .map(([intent, score]) => ({ intent, score }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return [{ intent: "general", score: 0 }];
  }
  return ranked;
}

function isShortFollowUp(text: string): boolean {
  const t = text.trim();
  if (t.length <= 28 && AFFIRMATION_RE.test(t)) return true;
  if (t.length <= 40 && FOLLOW_UP_RE.test(t)) return true;
  return t.length <= 12 && !/\?/.test(t);
}

function resolveFromPriorTopic(
  normalized: string,
  priorUserMessages: string[],
): { intent: TrainingIntent | null; note: string | null } {
  if (!isShortFollowUp(normalized) || priorUserMessages.length === 0) {
    return { intent: null, note: null };
  }

  const prior = priorUserMessages[priorUserMessages.length - 1] ?? "";
  const priorNorm = normalizeMessage(prior);
  const priorScores = scoreIntents(priorNorm, prior);
  const top = priorScores[0];
  if (!top || top.intent === "general" || top.intent === "greeting") {
    return { intent: null, note: null };
  }

  return {
    intent: top.intent,
    note: `Continuing prior topic (${top.intent}) from: "${prior.slice(0, 80)}"`,
  };
}

function computeConfidencePct(
  scores: Array<{ intent: TrainingIntent; score: number }>,
  entities: MessageEntities,
  contextResolved: boolean,
): { pct: number; ambiguity: boolean } {
  const top = scores[0];
  const second = scores[1]?.score ?? 0;
  const margin = top.score - second;

  let pct = 32 + Math.min(top.score * 11, 44) + Math.min(margin * 9, 22);
  if (entities.budget_egp != null) pct += 6;
  if (entities.occasion) pct += 6;
  if (entities.order_number) pct += 8;
  if (entities.wants_recommendation) pct += 4;
  if (contextResolved) pct += 14;
  if (top.score <= 1 && top.intent === "general") pct = Math.min(pct, 38);

  const ambiguity = margin <= 1 && top.score > 0 && scores.length > 1;
  if (ambiguity) pct = Math.min(pct, 55);

  return { pct: Math.round(Math.min(95, Math.max(22, pct))), ambiguity };
}

function buildUnderstandingHint(params: {
  language: DetectedLanguage;
  topIntent: TrainingIntent;
  entities: MessageEntities;
  confidencePct: number;
  contextNote: string | null;
  ambiguity: boolean;
}): string {
  const parts: string[] = [
    `Lang: ${params.language}`,
    `Intent: ${params.topIntent} (${params.confidencePct}%)`,
  ];

  if (params.entities.budget_egp != null) {
    parts.push(`Budget ~${params.entities.budget_egp} EGP`);
  }
  if (params.entities.occasion) parts.push(`Occasion: ${params.entities.occasion}`);
  if (params.entities.urgency) parts.push("Urgent");
  if (params.entities.dietary.length) parts.push(`Dietary: ${params.entities.dietary.join(",")}`);
  if (params.entities.order_number) parts.push(`Order ref: ${params.entities.order_number}`);
  if (params.entities.product_keywords.length) {
    parts.push(`Products: ${params.entities.product_keywords.join(",")}`);
  }
  if (params.entities.wants_recommendation) parts.push("Wants recommendation");
  if (params.entities.wants_comparison) parts.push("Wants comparison");
  if (params.contextNote) parts.push(params.contextNote);
  if (params.ambiguity) parts.push("Ambiguous — confirm before guessing");

  return parts.join(" · ");
}

export function understandUserMessage(params: {
  message: string;
  pageIntent?: MrBrowniePageIntent;
  priorUserMessages?: string[];
}): MessageUnderstanding {
  const raw = params.message.trim();
  const normalized = normalizeMessage(raw);
  const detected_language = detectLanguage(raw);
  const entities = extractMessageEntities(raw, normalized);

  let intent_scores = scoreIntents(normalized, raw);
  let context_note: string | null = null;

  const context = resolveFromPriorTopic(normalized, params.priorUserMessages ?? []);
  if (context.intent) {
    const boosted = context.intent;
    intent_scores = [
      { intent: boosted, score: (intent_scores[0]?.score ?? 0) + 4 },
      ...intent_scores.filter((s) => s.intent !== boosted),
    ].sort((a, b) => b.score - a.score);
    context_note = context.note;
  }

  if (params.pageIntent === "gift_builder" || params.pageIntent === "gift_box") {
    intent_scores = [
      { intent: "gift_request" as TrainingIntent, score: (intent_scores[0]?.score ?? 0) + 3 },
      ...intent_scores.filter((s) => s.intent !== "gift_request"),
    ].sort((a, b) => b.score - a.score);
  }

  if (entities.promo_code) {
    intent_scores = [
      { intent: "cart_help" as TrainingIntent, score: (intent_scores[0]?.score ?? 0) + 2 },
      ...intent_scores.filter((s) => s.intent !== "cart_help"),
    ].sort((a, b) => b.score - a.score);
  }

  const top_intent = intent_scores[0]?.intent ?? "general";
  const { pct: confidence_pct, ambiguity } = computeConfidencePct(
    intent_scores,
    entities,
    Boolean(context_note),
  );

  const understanding_hint = buildUnderstandingHint({
    language: detected_language,
    topIntent: top_intent,
    entities,
    confidencePct: confidence_pct,
    contextNote: context_note,
    ambiguity,
  });

  return {
    raw,
    normalized,
    detected_language,
    entities,
    intent_scores,
    top_intent,
    confidence_pct,
    ambiguity,
    context_note,
    understanding_hint,
  };
}
