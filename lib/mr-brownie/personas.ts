import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import type { PersonalityMode } from "@/lib/mr-brownie/brain/personality-router";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";

export type ChatPersona = "mr_brownie" | "mrs_cookie";
export type PersonaPreference = ChatPersona | "auto";

export type ChatProductCard = {
  id: string;
  name: string;
  price_egp: number;
  shop_path: string;
  image_url: string | null;
  in_stock: boolean;
};

export const PERSONA_CONFIG: Record<
  ChatPersona,
  {
    displayName: string;
    displayNameAr: string;
    mascotSrc: string;
    roleLabelEn: string;
    roleLabelAr: string;
    chipClass: string;
  }
> = {
  mr_brownie: {
    displayName: "Mr. Brownie",
    displayNameAr: "Mr. Brownie",
    mascotSrc: "/brand/mr-brownie-mascot.png",
    roleLabelEn: "Sales & discovery",
    roleLabelAr: "المبيعات والاكتشاف",
    chipClass: "cb-mr-brownie-chip--brownie",
  },
  mrs_cookie: {
    displayName: "Mrs. Cookie",
    displayNameAr: "Mrs. Cookie",
    mascotSrc: "/brand/mrs-cookie.png",
    roleLabelEn: "Support & care",
    roleLabelAr: "الدعم والرعاية",
    chipClass: "cb-mr-brownie-chip--cookie",
  },
};

const RESPONSE_STRUCTURE = `
Response structure (every customer reply):
1. Hook — brief personalized acknowledgment (1 sentence).
2. Core answer — direct, complete, max 3 sentences.
3. Value add — one related tip or product when relevant.
4. CTA — one soft closing question from CONTEXT.brain.follow_up_options when possible.
If uncertain, offer graceful escalation (support paths) — never dead-end.
`.trim();

/** المتجر للعملاء = Mr. Brownie فقط. الأدمن/الأونر يمكنهم اختيار الشخصية يدوياً. */
export function resolveChatPersona(params: {
  preference: PersonaPreference;
  intent: CommerceIntent;
  pageIntent: MrBrowniePageIntent;
  sentimentScore: number;
  personalityMode: PersonalityMode;
}): ChatPersona {
  if (params.preference === "mr_brownie" || params.preference === "mrs_cookie") {
    return params.preference;
  }

  if (
    params.personalityMode === "support" ||
    params.sentimentScore < -0.25 ||
    params.intent === "complaint" ||
    params.intent === "order_status"
  ) {
    return "mrs_cookie";
  }

  return "mr_brownie";
}

export function getChatPersonaInstruction(
  persona: ChatPersona,
  locale: "ar" | "en" | "auto" = "auto",
): string {
  const ar = locale !== "en";

  if (persona === "mrs_cookie") {
    return `
Active persona: Mrs. Cookie 🍪 (Support & Care Agent)
- Warm, patient, empathetic, thorough — no hard selling.
- Gentle reassuring tone; detailed steps when needed.
- For complaints: empathize first, numbered steps, link /help, /track, /account/orders.
- Moderate emoji — end of warm messages only.
- Arabic: clear Modern Standard Arabic for trust in support contexts.
${RESPONSE_STRUCTURE}
`.trim();
  }

  return `
Active persona: Mr. Brownie 🍫 (Sales & Discovery Agent)
- Enthusiastic, persuasive, fun — punchy sentences, light exclamations.
- Lead with 2–3 concrete picks from CONTEXT.products (name + price_egp + shop_path).
- One upsell or bundle hint when natural (gift box, 6-pack, free shipping gap).
- High emoji use — about every 1–2 sentences when tone is casual.
- Arabic: playful friendly MSA; family-friendly only.
${RESPONSE_STRUCTURE}
`.trim();
}

export function personaSubtitle(
  persona: ChatPersona,
  locale: "ar" | "en",
): string {
  const cfg = PERSONA_CONFIG[persona];
  return locale === "ar" ? cfg.roleLabelAr : cfg.roleLabelEn;
}

export function buildProductCardsFromSearch(
  items: Array<{
    id: string;
    name: string;
    price_egp: number;
    shop_path: string;
    image_url?: string | null;
    in_stock: boolean;
  }>,
  limit = 3,
): ChatProductCard[] {
  return items.slice(0, limit).map((p) => ({
    id: p.id,
    name: p.name,
    price_egp: p.price_egp,
    shop_path: p.shop_path,
    image_url: p.image_url ?? null,
    in_stock: p.in_stock,
  }));
}

export const PERSONA_PREF_LS_KEY = "mr-brownie-persona-pref-v1";

export function loadPersonaPreference(): PersonaPreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(PERSONA_PREF_LS_KEY);
    if (raw === "mr_brownie" || raw === "mrs_cookie" || raw === "auto") return raw;
  } catch {
    /* ignore */
  }
  return "auto";
}

export function savePersonaPreference(pref: PersonaPreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERSONA_PREF_LS_KEY, pref);
  } catch {
    /* ignore */
  }
}
