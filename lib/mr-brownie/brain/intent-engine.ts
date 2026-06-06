import type { TrainingIntent } from "@/lib/mr-brownie/training/types";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";
import {
  type DetectedLanguage,
  type MessageEntities,
  understandUserMessage,
} from "@/lib/mr-brownie/brain/message-understanding";

export type CommerceIntent =
  | TrainingIntent
  | "navigation"
  | "custom_request"
  | "fast_gift"
  | "promo_help";

export type IntentEngineResult = {
  primary: CommerceIntent;
  confidence: "high" | "medium" | "low";
  /** 0–100 — under 50 prefer clarification choices */
  confidence_pct: number;
  tags: string[];
  response_strategy: string;
  pre_thinking: string[];
  tools_to_run: Array<"search_products" | "gift_box_builder" | "cart_summary">;
  detected_language: DetectedLanguage;
  entities: MessageEntities;
  understanding_hint: string;
  ambiguity: boolean;
};

function detectSubTags(message: string, entities: MessageEntities): string[] {
  const tags: string[] = [];
  const m = message.toLowerCase();
  if (entities.urgency || /بسرعة|سريع|دلوقتي|urgent|asap|fast/i.test(m)) {
    tags.push("urgent");
  }
  if (
    entities.budget_egp != null ||
    /رخيص|cheap|اقتصاد|budget|تحت \d+/i.test(m)
  ) {
    tags.push("budget_sensitive");
  }
  if (/فاخر|luxury|مميز|premium/i.test(m) || (entities.budget_egp ?? 0) >= 800) {
    tags.push("premium");
  }
  if (/مخصص|custom|رسالة|كارت|personalized/i.test(m)) tags.push("personalized");
  if (entities.wants_recommendation) tags.push("wants_pick");
  if (entities.wants_comparison) tags.push("wants_compare");
  if (entities.dietary.length) tags.push(...entities.dietary);
  if (entities.occasion) tags.push(`occasion_${entities.occasion}`);
  return [...new Set(tags)];
}

function detectPromoIntent(message: string, entities: MessageEntities): boolean {
  return (
    Boolean(entities.promo_code) ||
    /كود|كوبون|خصم|برومو|promo|coupon|discount\s*code/i.test(message)
  );
}

function refineIntent(base: TrainingIntent, message: string, entities: MessageEntities): CommerceIntent {
  const m = message.toLowerCase();
  if (detectPromoIntent(message, entities)) return "promo_help";
  if (base === "gift_request" && (entities.urgency || /بسرعة|سريع|fast|asap/.test(m))) {
    return "fast_gift";
  }
  if (/فين|ازاي|كيف|where|how to|رابط|صفحة|link to|open the/i.test(m)) {
    if (base !== "order_status" && !/أوردر|اوردر|طلب|order|track/i.test(m)) {
      return "navigation";
    }
  }
  if (/مخصص|تصميم|علامة|branding|corporate|شركة|logo/i.test(m)) {
    return "custom_request";
  }
  return base;
}

function confidenceLabel(pct: number): IntentEngineResult["confidence"] {
  if (pct >= 78) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

export function runIntentEngine(params: {
  userMessage: string;
  pageIntent: MrBrowniePageIntent;
  priorUserMessages?: string[];
}): IntentEngineResult {
  const understanding = understandUserMessage({
    message: params.userMessage,
    pageIntent: params.pageIntent,
    priorUserMessages: params.priorUserMessages,
  });

  const base = understanding.top_intent;
  const primary = refineIntent(base, params.userMessage, understanding.entities);
  const tags = detectSubTags(params.userMessage, understanding.entities);

  const pre_thinking = [
    understanding.understanding_hint,
    "What does the user want to achieve?",
    "What facts exist in CONTEXT (products, cart, FAQ, memory)?",
    understanding.ambiguity
      ? "Intent is ambiguous — ask ONE clarifying question with 2–3 choices."
      : "Do I need one clarifying question?",
    "Which tool_results apply (product_search, cart)?",
    "What single CTA closes the loop?",
  ];

  let response_strategy =
    "Friendly opener → facts from CONTEXT → one suggestion → follow-up question.";
  const tools_to_run: IntentEngineResult["tools_to_run"] = ["search_products"];

  switch (primary) {
    case "fast_gift":
      response_strategy =
        "Short reply; recommend 1–2 gift SKUs or /gift-box; urgent tone; direct CTA to checkout.";
      tools_to_run.push("gift_box_builder");
      break;
    case "gift_request":
    case "custom_request":
      response_strategy =
        "Clarify occasion/budget if missing → 2–3 picks from tool_results → offer /gift-box/build.";
      tools_to_run.push("gift_box_builder");
      break;
    case "product_browse":
    case "budget":
    case "pairing":
      response_strategy = understanding.entities.wants_comparison
        ? "Compare 2–3 SKUs with why; prices + shop_path; highlight differences."
        : "Compare 2–3 SKUs with why; mention price_egp; shop_path links.";
      break;
    case "cart_help":
      response_strategy = "Summarize CONTEXT.cart; free-ship gap; suggest add-on.";
      tools_to_run.push("cart_summary");
      break;
    case "order_status":
    case "navigation":
      response_strategy = "Point to /track, /account/orders, or relevant /help article.";
      break;
    case "complaint":
      response_strategy = "Empathy → facts needed → /help/returns; no sales pressure.";
      break;
    case "delivery_faq":
      response_strategy = "Answer from knowledge_base.faq; WhatsApp for zone specifics.";
      break;
    case "promo_help":
      response_strategy =
        "Validate promo from tool_results.promo_preview; offer client_actions.apply_promo; never invent codes.";
      tools_to_run.push("cart_summary");
      break;
    default:
      if (understanding.entities.wants_recommendation) {
        response_strategy =
          "User wants a pick — suggest 2–3 products from tool_results with brief why.";
      }
      break;
  }

  if (params.pageIntent === "gift_builder") {
    tools_to_run.push("gift_box_builder");
  }

  const confidence_pct = understanding.confidence_pct;

  return {
    primary,
    confidence: confidenceLabel(confidence_pct),
    confidence_pct,
    tags,
    response_strategy,
    pre_thinking,
    tools_to_run: [...new Set(tools_to_run)],
    detected_language: understanding.detected_language,
    entities: understanding.entities,
    understanding_hint: understanding.understanding_hint,
    ambiguity: understanding.ambiguity,
  };
}

export function buildSmartFallback(intent: CommerceIntent, locale: "ar" | "en" | "auto"): string {
  const ar = locale !== "en";
  if (ar) {
    return `هل يمكنك التوضيح أكثر؟\n\nهل تقصد:\n* صندوق هدية → /gift-box\n* منتج معيّن → /shop\n* طلب أو توصيل → /track أو /help`;
  }
  if (intent === "complaint") {
    return `I want to help — can you share your order number and what went wrong? See /help/returns for our policy.`;
  }
  return `Could you clarify a bit?\n\n* Gift box → /gift-box\n* Browse products → /shop\n* Order help → /track or /help`;
}
