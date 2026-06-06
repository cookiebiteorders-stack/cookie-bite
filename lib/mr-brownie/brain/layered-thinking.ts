import type { IntentEngineResult } from "@/lib/mr-brownie/brain/intent-engine";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import type { MessageEntities } from "@/lib/mr-brownie/brain/message-understanding";

export type LayeredThinkingPlan = {
  layer1_understanding: {
    user_goal: string;
    clarity: "clear" | "partial" | "unclear";
    missing_info: string[];
    language: string;
    entities: MessageEntities;
  };
  layer2_decision: {
    action: "answer" | "clarify" | "use_tools" | "support_only";
    tools: string[];
    rationale: string;
  };
  layer3_formatting: {
    tone: string;
    must_include: string[];
    follow_up_template: string;
  };
};

export function buildLayeredThinkingPlan(params: {
  userMessage: string;
  intent: IntentEngineResult;
  confidencePct: number;
}): LayeredThinkingPlan {
  const msg = params.userMessage.trim();
  const entities = params.intent.entities;
  const unclear =
    params.intent.confidence === "low" ||
    params.confidencePct < 50 ||
    params.intent.ambiguity;
  const missing: string[] = [];
  if (params.intent.primary === "gift_request" || params.intent.primary === "fast_gift") {
    if (!entities.occasion && !/مناسبة|occasion|birthday|هدية ل/i.test(msg)) {
      missing.push("occasion");
    }
    if (entities.budget_egp == null && !/\d+|جنيه|budget|ميزانية/i.test(msg)) {
      missing.push("budget_hint");
    }
  }
  if (params.intent.primary === "order_status" && !entities.order_number) {
    missing.push("order_number");
  }
  if (params.intent.primary === "complaint" && !entities.order_number) {
    missing.push("issue_details");
  }

  let action: LayeredThinkingPlan["layer2_decision"]["action"] = "answer";
  if (unclear) action = "clarify";
  else if (params.intent.tools_to_run.length > 0) action = "use_tools";
  else if (params.intent.primary === "complaint") action = "support_only";

  const tone =
    params.intent.primary === "complaint"
      ? "calm_support"
      : params.intent.primary === "fast_gift"
        ? "fast_sales"
        : "friendly_sales";

  return {
    layer1_understanding: {
      user_goal: describeGoal(params.intent.primary),
      clarity: unclear ? "unclear" : missing.length ? "partial" : "clear",
      missing_info: missing,
      language: params.intent.detected_language,
      entities: params.intent.entities,
    },
    layer2_decision: {
      action,
      tools: params.intent.tools_to_run,
      rationale: params.intent.response_strategy,
    },
    layer3_formatting: {
      tone,
      must_include: [
        "one concrete suggestion from tool_results or products",
        "one follow-up question or CTA",
      ],
      follow_up_template: pickFollowUpTemplate(params.intent.primary),
    },
  };
}

function describeGoal(intent: CommerceIntent): string {
  const map: Record<string, string> = {
    gift_request: "Find or build a gift",
    fast_gift: "Quick gift purchase",
    product_browse: "Choose products",
    delivery_faq: "Delivery / shipping info",
    order_status: "Track or check order",
    complaint: "Resolve an issue",
    cart_help: "Cart / checkout help",
    navigation: "Find a page on site",
    custom_request: "Custom / corporate order",
    budget: "Shop within budget",
    pairing: "Flavor pairing advice",
    greeting: "Start conversation",
    general: "General store help",
  };
  return map[intent] ?? "General assistance";
}

function pickFollowUpTemplate(intent: CommerceIntent): string {
  if (intent === "gift_request" || intent === "fast_gift") {
    return "هل تفضّل صندوقاً جاهزاً أم التخصيص بنفسك؟";
  }
  if (intent === "product_browse" || intent === "budget") {
    return "هل أرشّح لك 2–3 خيارات حسب ميزانيتك؟";
  }
  if (intent === "complaint") {
    return "هل لديك رقم الطلب وصورة للصندوق؟";
  }
  return "هل تريد مساعدة في شيء آخر؟";
}
