import type { PersonalityMode } from "@/lib/mr-brownie/brain/personality-router";

/** أسلوب الإجابة — كيف يكتب Mr. Brownie (منفصل عن intent routing) */
export type AnswerStyle =
  | "friendly"
  | "concise"
  | "detailed"
  | "enthusiastic"
  | "calm"
  | "expert";

export type AnswerStylePreference = AnswerStyle | "auto";

export const ANSWER_STYLE_PREF_LS_KEY = "mr-brownie-answer-style-v1";

export const ANSWER_STYLE_ORDER: readonly AnswerStyle[] = [
  "friendly",
  "concise",
  "detailed",
  "enthusiastic",
  "calm",
  "expert",
] as const;

export const ANSWER_STYLE_CONFIG: Record<
  AnswerStyle,
  { emoji: string; labelKey: string; hintKey: string }
> = {
  friendly: {
    emoji: "🍫",
    labelKey: "mrBrownieChat.answerStyles.friendly",
    hintKey: "mrBrownieChat.answerStyles.friendlyHint",
  },
  concise: {
    emoji: "⚡",
    labelKey: "mrBrownieChat.answerStyles.concise",
    hintKey: "mrBrownieChat.answerStyles.conciseHint",
  },
  detailed: {
    emoji: "📋",
    labelKey: "mrBrownieChat.answerStyles.detailed",
    hintKey: "mrBrownieChat.answerStyles.detailedHint",
  },
  enthusiastic: {
    emoji: "✨",
    labelKey: "mrBrownieChat.answerStyles.enthusiastic",
    hintKey: "mrBrownieChat.answerStyles.enthusiasticHint",
  },
  calm: {
    emoji: "🤍",
    labelKey: "mrBrownieChat.answerStyles.calm",
    hintKey: "mrBrownieChat.answerStyles.calmHint",
  },
  expert: {
    emoji: "🎯",
    labelKey: "mrBrownieChat.answerStyles.expert",
    hintKey: "mrBrownieChat.answerStyles.expertHint",
  },
};

const STYLE_INSTRUCTIONS: Record<AnswerStyle, { en: string; ar: string }> = {
  friendly: {
    en: `Answer style: FRIENDLY (balanced Mr. Brownie)
- Warm hook + clear answer + one helpful tip; max 3–4 short sentences.
- 1–2 emojis when tone is casual; family-friendly Modern Standard Arabic or clear English.`,
    ar: `أسلوب الإجابة: ودّي (Mr. Brownie متوازن)
- مقدمة لطيفة + جواب واضح + نصيحة واحدة؛ 3–4 جمل قصيرة كحد أقصى.
- 1–2 إيموجي عند الحوار العادي؛ عربية فصحى واضحة أو إنجليزية بسيطة.`,
  },
  concise: {
    en: `Answer style: CONCISE
- Lead with the direct answer in the first sentence.
- Prefer bullets (max 3) for options; no filler, no long intros.
- Max 2 emojis total; skip upsell unless the user asked to buy.`,
    ar: `أسلوب الإجابة: مختصر
- ابدأ بالجواب مباشرة في الجملة الأولى.
- استخدم نقاطاً (3 كحد أقصى) للخيارات؛ بدون حشو أو مقدمات طويلة.
- إيموجي واحد أو اثنان فقط؛ بدون upsell إلا إذا طلب الشراء.`,
  },
  detailed: {
    en: `Answer style: DETAILED
- Explain the "why" behind recommendations; compare 2 options when useful.
- Up to 5 short sentences; numbered steps for policies or delivery.
- Moderate emoji; prioritize clarity over hype.`,
    ar: `أسلوب الإجابة: مفصّل
- اشرح «لماذا» خلف التوصيات؛ قارن بين خيارين عند الحاجة.
- حتى 5 جمل قصيرة؛ خطوات مرقّمة للسياسات أو التوصيل.
- إيموجي معتدل؛ الوضوح أهم من الحماس.`,
  },
  enthusiastic: {
    en: `Answer style: ENTHUSIASTIC (gift & discovery energy)
- Punchy sentences, light exclamations, celebratory tone when fitting.
- Name 2–3 products with price_egp + shop_path; one bundle/gift hint.
- More emoji (max 4) — still family-friendly; never pressure during complaints.`,
    ar: `أسلوب الإجابة: حماسي (اكتشاف وهدايا)
- جمل حيوية، تعجب خفيف، نبرة احتفالية عند المناسب.
- 2–3 منتجات بالسعر + shop_path؛ تلميح هدية/بوكس واحد.
- إيموجي أكثر (4 كحد أقصى) — عائلي دائماً؛ بدون ضغط عند الشكاوى.`,
  },
  calm: {
    en: `Answer style: CALM (support-first tone)
- Slow, reassuring pacing; empathize before solutions.
- Numbered steps for issues; link /help, /track, /account/orders when relevant.
- Minimal emoji; no hard sell or urgency language.`,
    ar: `أسلوب الإجابة: هادئ (دعم أولاً)
- إيقاع مطمئن؛ تعاطف قبل الحل.
- خطوات مرقّمة للمشاكل؛ روابط /help و/track و/account/orders عند الحاجة.
- إيموجي قليل؛ بدون ضغط بيع أو استعجال.`,
  },
  expert: {
    en: `Answer style: EXPERT (pairing & craft advisor)
- Confident, knowledgeable pastry-shop tone — like a senior advisor.
- Mention pairings, portions, freshness, or gift suitability with specifics from CONTEXT.
- Structured: recommendation → reason → optional next step; max 1–2 emojis.`,
    ar: `أسلوب الإجابة: خبير (مستشار مخبوزات)
- نبرة واثقة وعارفة — كمستشار متجر محترف.
- اذكر التوافقات، الحصص، الطازة، أو مناسبة الهدية من CONTEXT.
- بنية: توصية → سبب → خطوة تالية؛ 1–2 إيموجي.`,
  },
};

export function resolveAnswerStyle(params: {
  preference: AnswerStylePreference;
  personalityMode: PersonalityMode;
  crisisMode: boolean;
}): AnswerStyle {
  if (params.crisisMode) return "calm";

  if (params.preference !== "auto") {
    if (params.personalityMode === "support" && params.preference === "enthusiastic") {
      return "calm";
    }
    return params.preference;
  }

  switch (params.personalityMode) {
    case "support":
      return "calm";
    case "sales":
      return "enthusiastic";
    default:
      return "friendly";
  }
}

export function getAnswerStyleInstruction(
  style: AnswerStyle,
  locale: "ar" | "en" | "auto" = "auto",
): string {
  const useAr = locale !== "en";
  return useAr ? STYLE_INSTRUCTIONS[style].ar : STYLE_INSTRUCTIONS[style].en;
}

export function loadAnswerStylePreference(): AnswerStylePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(ANSWER_STYLE_PREF_LS_KEY);
    if (raw === "auto") return "auto";
    if (raw && raw in ANSWER_STYLE_CONFIG) return raw as AnswerStyle;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function saveAnswerStylePreference(pref: AnswerStylePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANSWER_STYLE_PREF_LS_KEY, pref);
  } catch {
    /* ignore */
  }
}

export function isAnswerStylePreference(value: string): value is AnswerStylePreference {
  if (value === "auto") return true;
  return value in ANSWER_STYLE_CONFIG;
}
