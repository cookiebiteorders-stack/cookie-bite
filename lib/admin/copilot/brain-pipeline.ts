import { buildConversationWindowSummary } from "@/lib/mr-brownie/brain/context-window";
import { buildLayeredThinkingPlan } from "@/lib/mr-brownie/brain/layered-thinking";
import type { IntentEngineResult } from "@/lib/mr-brownie/brain/intent-engine";
import { runIntentEngine } from "@/lib/mr-brownie/brain/intent-engine";
import type { CopilotPromptContext } from "@/lib/admin/copilot/system-prompt";

export type CopilotBrainMeta = {
  agent_id: "mrs_cookie";
  intent_engine: IntentEngineResult;
  layered_thinking: ReturnType<typeof buildLayeredThinkingPlan>;
  conversation_window: ReturnType<typeof buildConversationWindowSummary>;
  clarification_mode: boolean;
  output_rules: string[];
  snapshot: CopilotPromptContext["snapshot"];
  current_path: string;
};

function adminIntentFromPath(path: string): IntentEngineResult["primary"] {
  if (path.includes("/orders")) return "order_status";
  if (path.includes("/products")) return "product_browse";
  if (path.includes("/customers")) return "general";
  if (path.includes("/analytics") || path.includes("/dashboard")) return "general";
  return "general";
}

/** عقل Mrs. Cookie — نفس طبقات الفهم/القرار مع سياق لوحة الإدارة */
export function buildCopilotBrainMeta(params: {
  userMessage: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  currentPath: string;
  snapshot: CopilotPromptContext["snapshot"];
}): CopilotBrainMeta {
  const pageIntent = params.currentPath.includes("/products")
    ? "product_detail"
    : params.currentPath.includes("/gift")
      ? "gift_box"
      : "other";

  const intent_engine = runIntentEngine({
    userMessage: params.userMessage,
    pageIntent,
  });

  if (params.snapshot?.pendingOrders && params.snapshot.pendingOrders > 5) {
    intent_engine.tags.push("urgent");
    intent_engine.confidence_pct = Math.max(intent_engine.confidence_pct, 75);
  }

  const pathHint = adminIntentFromPath(params.currentPath);
  if (pathHint !== "general") {
    intent_engine.primary = pathHint;
    intent_engine.response_strategy =
      "Use admin tools data; cite dashboard snapshot; confirm before destructive actions.";
  }

  const conversation_window = buildConversationWindowSummary(params.history);
  const layered_thinking = buildLayeredThinkingPlan({
    userMessage: params.userMessage,
    intent: intent_engine,
    confidencePct: intent_engine.confidence_pct,
  });

  const clarification_mode = intent_engine.confidence_pct < 50;

  return {
    agent_id: "mrs_cookie",
    intent_engine,
    layered_thinking,
    conversation_window,
    clarification_mode,
    snapshot: params.snapshot,
    current_path: params.currentPath,
    output_rules: [
      "Admin copilot: concise ops tone, no customer PII dumps.",
      "Use BRAIN_CONTEXT snapshot for numbers — do not invent KPIs.",
      "If clarification_mode, ask one focused admin question with options.",
      "End with one actionable next step for the operator.",
    ],
  };
}
