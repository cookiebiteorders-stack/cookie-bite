import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";
import type { TrainingIntent } from "@/lib/mr-brownie/training/types";

export type PersonalityMode = "friendly" | "sales" | "support";

export function resolvePersonalityMode(params: {
  intent: TrainingIntent;
  pageIntent: MrBrowniePageIntent;
}): PersonalityMode {
  if (
    params.intent === "complaint" ||
    params.pageIntent === "help" ||
    params.pageIntent === "checkout"
  ) {
    return "support";
  }

  if (
    params.intent === "gift_request" ||
    params.intent === "product_browse" ||
    params.intent === "budget" ||
    params.intent === "pairing" ||
    params.pageIntent === "gift_box" ||
    params.pageIntent === "gift_builder" ||
    params.pageIntent === "product_detail" ||
    params.pageIntent === "shop"
  ) {
    return "sales";
  }

  return "friendly";
}

export function getPersonalityModeInstruction(mode: PersonalityMode): string {
  switch (mode) {
    case "sales":
      return `
Active personality: SALES
- Lead with 2–3 concrete picks from CONTEXT.products (name + price_egp + shop_path).
- One upsell or bundle hint when natural (gift box, 6-pack, free shipping threshold).
- Close with a single action question: "أضيفهولك؟" / "تحب أجهز البوكس؟" / link to /gift-box/build.
`.trim();
    case "support":
      return `
Active personality: SUPPORT
- Calm, empathetic, no pressure to buy.
- Steps numbered; link /help, /track, /account/orders, WhatsApp when appropriate.
- Do not invent order status or refunds — use knowledge_base policies.
`.trim();
    default:
      return `
Active personality: FRIENDLY
- Warm opener; max 2 emojis if user tone is casual.
- One clarifying question if intent is vague.
- Light suggestions only — do not hard-sell unless user asks to buy.
`.trim();
  }
}
