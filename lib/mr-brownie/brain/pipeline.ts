import type { UserRole } from "@/lib/admin/rbac";
import type { CartLine } from "@/lib/cart/types";
import {
  executeMrBrownieTools,
  MR_BROWNIE_TOOL_CATALOG,
  type MrBrownieToolResults,
} from "@/lib/mr-brownie/brain/execute-tools";
import { buildConversationWindowSummary } from "@/lib/mr-brownie/brain/context-window";
import { buildSmartFollowUps } from "@/lib/mr-brownie/brain/follow-up-engine";
import {
  buildLayeredThinkingPlan,
  type LayeredThinkingPlan,
} from "@/lib/mr-brownie/brain/layered-thinking";
import {
  buildConversationMemoryGraph,
  type ConversationMemoryGraph,
} from "@/lib/mr-brownie/brain/memory-graph";
import {
  buildSmartFallback,
  runIntentEngine,
  type IntentEngineResult,
} from "@/lib/mr-brownie/brain/intent-engine";
import {
  getPersonalityModeInstruction,
  resolvePersonalityMode,
  type PersonalityMode,
} from "@/lib/mr-brownie/brain/personality-router";
import {
  routeTools,
  toolsToExecuteFromRoutes,
  type ToolRouteDecision,
} from "@/lib/mr-brownie/brain/tool-router";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";
import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";
import type { CustomerMemorySnapshot } from "@/lib/mr-brownie/fetch-customer-memory";

export type BrainPipelineMeta = {
  input: {
    has_user_message: boolean;
    locale: string;
    pathname: string;
    page_intent: MrBrowniePageIntent;
  };
  intent_engine: IntentEngineResult;
  classified_intent: string;
  active_personality: PersonalityMode;
  personality_instruction: string;
  layered_thinking: LayeredThinkingPlan;
  memory_graph: ConversationMemoryGraph;
  conversation_window: ReturnType<typeof buildConversationWindowSummary>;
  tool_routes: ToolRouteDecision[];
  tool_catalog: typeof MR_BROWNIE_TOOL_CATALOG;
  tool_results: MrBrownieToolResults;
  follow_up_options: string[];
  clarification_mode: boolean;
  clarification_prompt: string | null;
  output_rules: string[];
  conversion_hints: string[];
  supervisor: { enabled: true; post_critic: boolean; coach_env: string };
};

export function buildBrainPipelineMeta(params: {
  lastUserMessage?: string;
  locale: "ar" | "en" | "auto";
  pathname: string;
  pageIntent: MrBrowniePageIntent;
  products: AiCatalogProduct[];
  cartLines: CartLine[];
  role: UserRole | "guest";
  conversationMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  memory?: CustomerMemorySnapshot | null;
  userProfile?: {
    display_name: string | null;
    favorite_product_names: string[];
    order_count: number;
    budget_signal: string;
    last_order_hint: string | null;
  } | null;
  loyaltyTier?: string | null;
}): BrainPipelineMeta {
  const intent_engine = runIntentEngine({
    userMessage: params.lastUserMessage ?? "",
    pageIntent: params.pageIntent,
  });

  const tool_routes = routeTools(intent_engine);
  intent_engine.tools_to_run = toolsToExecuteFromRoutes(
    tool_routes,
    intent_engine.tools_to_run,
  );

  const active_personality =
    params.role === "guest" || params.role === "customer"
      ? resolvePersonalityMode({
          intent:
            intent_engine.primary === "fast_gift"
              ? "gift_request"
              : intent_engine.primary === "navigation"
                ? "general"
                : intent_engine.primary === "custom_request"
                  ? "gift_request"
                  : intent_engine.primary,
          pageIntent: params.pageIntent,
        })
      : "friendly";

  const tool_results = executeMrBrownieTools({
    intent: intent_engine,
    userMessage: params.lastUserMessage ?? "",
    products: params.products,
    cartLines: params.cartLines,
  });

  const conversation_window = buildConversationWindowSummary(
    params.conversationMessages ?? [],
  );

  const memory_graph = buildConversationMemoryGraph({
    displayName: params.userProfile?.display_name ?? null,
    loyaltyTier: params.loyaltyTier ?? null,
    memory: params.memory ?? null,
    userProfile: params.userProfile ?? null,
    conversationSummary: conversation_window.summary,
  });

  const layered_thinking = buildLayeredThinkingPlan({
    userMessage: params.lastUserMessage ?? "",
    intent: intent_engine,
    confidencePct: intent_engine.confidence_pct,
  });

  const clarification_mode = intent_engine.confidence_pct < 50;
  const clarification_prompt = clarification_mode
    ? buildSmartFallback(intent_engine.primary, params.locale)
    : null;

  const follow_up_options = buildSmartFollowUps(intent_engine.primary, params.locale);

  const conversion_hints: string[] = [];
  if (active_personality === "sales") {
    conversion_hints.push(
      "Use follow_up_options[0] style closing when appropriate.",
      "Optional upsell from tool_results.search_products.",
    );
    if (tool_results.cart_summary?.amount_to_free_delivery_egp) {
      conversion_hints.push(
        `Free delivery gap: ${tool_results.cart_summary.amount_to_free_delivery_egp} EGP.`,
      );
    }
  }

  return {
    input: {
      has_user_message: Boolean(params.lastUserMessage?.trim()),
      locale: params.locale,
      pathname: params.pathname,
      page_intent: params.pageIntent,
    },
    intent_engine,
    classified_intent: intent_engine.primary,
    active_personality,
    personality_instruction: getPersonalityModeInstruction(active_personality),
    layered_thinking,
    memory_graph,
    conversation_window,
    tool_routes,
    tool_catalog: MR_BROWNIE_TOOL_CATALOG,
    tool_results,
    follow_up_options,
    clarification_mode,
    clarification_prompt,
    output_rules: [
      intent_engine.response_strategy,
      "Execute layered_thinking: understand → decide → format (do not expose layer labels).",
      "If clarification_mode, use clarification_prompt pattern with choices — do not guess.",
      "If confidence_pct >= 90, answer directly; if 50–89, brief answer + one question; if <50, clarify first.",
      "Pick one string from follow_up_options as closing question when possible.",
    ],
    conversion_hints,
    supervisor: {
      enabled: true,
      post_critic: true,
      coach_env: "MR_BROWNIE_ENABLE_COACH",
    },
  };
}
