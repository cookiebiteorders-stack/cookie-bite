import { detectTrainingIntent } from "@/lib/mr-brownie/training/detect-intent";
import type { TrainingIntent } from "@/lib/mr-brownie/training/types";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";

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
};

function detectSubTags(message: string): string[] {
  const tags: string[] = [];
  const m = message.toLowerCase();
  if (/بسرعة|سريع|دلوقتي|urgent|asap|fast/i.test(m)) tags.push("urgent");
  if (/رخيص|cheap|اقتصاد|budget|تحت \d+/i.test(m)) tags.push("budget_sensitive");
  if (/فاخر|luxury|مميز|premium/i.test(m)) tags.push("premium");
  if (/مخصص|custom|رسالة|كارت/i.test(m)) tags.push("personalized");
  return tags;
}

function detectPromoIntent(message: string): boolean {
  return /كود|كوبون|خصم|برومو|promo|coupon|discount\s*code/i.test(message);
}

function refineIntent(base: TrainingIntent, message: string): CommerceIntent {
  const m = message.toLowerCase();
  if (detectPromoIntent(message)) return "promo_help";
  if (base === "gift_request" && /بسرعة|سريع|fast|asap/.test(m)) {
    return "fast_gift";
  }
  if (/فين|ازاي|كيف|where|how to|رابط|صفحة/.test(m)) {
    return "navigation";
  }
  if (/مخصص|تصميم|علامة|branding|corporate|شركة/.test(m)) {
    return "custom_request";
  }
  return base;
}

export function runIntentEngine(params: {
  userMessage: string;
  pageIntent: MrBrowniePageIntent;
}): IntentEngineResult {
  const base = detectTrainingIntent(params.userMessage);
  const primary = refineIntent(base, params.userMessage);
  const tags = detectSubTags(params.userMessage);

  const pre_thinking = [
    "What does the user want to achieve?",
    "What facts exist in CONTEXT (products, cart, FAQ, memory)?",
    "Do I need one clarifying question?",
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
        "Clarify occasion/budget → 2–3 picks from tool_results → offer /gift-box/build.";
      tools_to_run.push("gift_box_builder");
      break;
    case "product_browse":
    case "budget":
    case "pairing":
      response_strategy =
        "Compare 2–3 SKUs with why; mention price_egp; shop_path links.";
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
      break;
  }

  if (params.pageIntent === "gift_builder") {
    tools_to_run.push("gift_box_builder");
  }

  const confidence =
    base === "general" && !tags.length ? "low" : tags.includes("urgent") ? "high" : "medium";

  const confidence_pct =
    confidence === "high" ? 90 : confidence === "medium" ? 60 : 30;

  return {
    primary,
    confidence,
    confidence_pct,
    tags,
    response_strategy,
    pre_thinking,
    tools_to_run: [...new Set(tools_to_run)],
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
