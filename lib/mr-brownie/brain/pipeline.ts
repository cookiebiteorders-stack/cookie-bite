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
  buildProductCardsFromSearch,
  type ChatPersona,
  type ChatProductCard,
  type PersonaPreference,
} from "@/lib/mr-brownie/personas";
import { buildActionCardsForIntent, type ChatActionCard } from "@/lib/mr-brownie/action-cards";
import {
  buildEmotionTrajectory,
  emotionTrajectoryInstruction,
  type EmotionTrajectory,
} from "@/lib/mr-brownie/emotion-trajectory";
import { resolveRagMeta, type RagSource } from "@/lib/mr-brownie/brain/knowledge-gaps";
import type { KnowledgeSnippet } from "@/lib/mr-brownie/brain/vector-retrieval";
import { buildEscalationActionCards } from "@/lib/mr-brownie/escalation";
import { giftOccasionHint, detectGiftOccasion } from "@/lib/mr-brownie/gift-occasion";
import { buildProactiveSuggestions } from "@/lib/mr-brownie/proactive-suggestions";
import {
  resolvePersonaInstruction,
  type PersonaPromptOverrides,
} from "@/lib/mr-brownie/persona-prompts";
import type { PromptVariant } from "@/lib/mr-brownie/prompt-variant";
import {
  getStorefrontPersonaInstruction,
  STOREFRONT_PERSONA,
} from "@/lib/mr-brownie/storefront-persona";
import {
  buildSeasonalChatContext,
  type SeasonalChatContext,
} from "@/lib/mr-brownie/seasonal-context";
import { scoreSentiment } from "@/lib/mr-brownie/sentiment";
import { toneVectorInstruction, type ToneVector } from "@/lib/mr-brownie/tone-vector";
import {
  routeTools,
  toolsToExecuteFromRoutes,
  type ToolRouteDecision,
} from "@/lib/mr-brownie/brain/tool-router";
import type { MrBrowniePageIntent } from "@/lib/mr-brownie/page-intent";
import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";
import type { CustomerMemorySnapshot } from "@/lib/mr-brownie/fetch-customer-memory";
import type { ChatClientAction } from "@/lib/mr-brownie/chat-client-actions";
import {
  getAnswerStyleInstruction,
  resolveAnswerStyle,
  type AnswerStyle,
  type AnswerStylePreference,
} from "@/lib/mr-brownie/answer-styles";

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
  active_persona: ChatPersona;
  prompt_variant: PromptVariant;
  sentiment_score: number;
  persona_preference: PersonaPreference;
  answer_style_preference: AnswerStylePreference;
  active_answer_style: AnswerStyle;
  answer_style_instruction: string;
  personality_instruction: string;
  persona_instruction: string;
  product_cards: ChatProductCard[];
  action_cards: ChatActionCard[];
  client_actions: ChatClientAction[];
  emotion_trajectory: EmotionTrajectory;
  seasonal_context: SeasonalChatContext;
  tone_vector: ToneVector | null;
  knowledge_snippets: KnowledgeSnippet[];
  rag_source: RagSource | null;
  rag_hit_count: number;
  gift_occasion: ReturnType<typeof detectGiftOccasion>;
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
  personaPreference?: PersonaPreference;
  answerStylePreference?: AnswerStylePreference;
  personaPromptOverrides?: PersonaPromptOverrides;
  promptVariant?: PromptVariant;
  toneVector?: ToneVector | null;
  faqEntries?: Array<{ question: string; answer: string; lang: string }>;
  knowledgeSnippets?: KnowledgeSnippet[];
  clientActions?: ChatClientAction[];
  promoPreview?: MrBrownieToolResults["promo_preview"];
}): BrainPipelineMeta {
  const prompt_variant: PromptVariant = params.promptVariant ?? "a";
  const persona_preference = params.personaPreference ?? "auto";
  const answer_style_preference = params.answerStylePreference ?? "auto";
  const sentiment_score = scoreSentiment(params.lastUserMessage ?? "");

  const intent_engine = runIntentEngine({
    userMessage: params.lastUserMessage ?? "",
    pageIntent: params.pageIntent,
    priorUserMessages: (params.conversationMessages ?? [])
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .slice(0, -1)
      .slice(-3),
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
                  : intent_engine.primary === "promo_help"
                    ? "cart_help"
                    : intent_engine.primary,
          pageIntent: params.pageIntent,
        })
      : "friendly";

  const emotion_trajectory = buildEmotionTrajectory(params.conversationMessages ?? []);

  const active_answer_style = resolveAnswerStyle({
    preference: answer_style_preference,
    personalityMode: active_personality,
    crisisMode: emotion_trajectory.crisis_mode,
  });
  const answer_style_instruction = getAnswerStyleInstruction(
    active_answer_style,
    params.locale,
  );

  const isStorefront = params.role === "guest" || params.role === "customer";
  const active_persona: ChatPersona = isStorefront ? STOREFRONT_PERSONA : STOREFRONT_PERSONA;

  const gift_occasion = detectGiftOccasion(params.lastUserMessage ?? "");
  const knowledge_snippets = params.knowledgeSnippets ?? [];
  const rag_meta = resolveRagMeta(
    knowledge_snippets,
    Boolean(params.lastUserMessage?.trim()),
  );

  const seasonal_context = buildSeasonalChatContext(params.locale);
  const tone_vector = params.toneVector ?? null;

  const tool_results = executeMrBrownieTools({
    intent: intent_engine,
    userMessage: params.lastUserMessage ?? "",
    products: params.products,
    cartLines: params.cartLines,
    promoPreview: params.promoPreview ?? null,
  });

  const client_actions = params.clientActions ?? [];

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

  const intentFollowUps = buildSmartFollowUps(intent_engine.primary, params.locale);
  const proactive = isStorefront
    ? buildProactiveSuggestions({
        locale: params.locale,
        pageIntent: params.pageIntent,
        pathname: params.pathname,
        cartLines: params.cartLines,
        seasonal: seasonal_context,
        lastUserMessage: params.lastUserMessage,
      })
    : [];
  const follow_up_options = [...new Set([...intentFollowUps, ...proactive])].slice(0, 4);

  const product_cards =
    tool_results.search_products.length > 0
      ? buildProductCardsFromSearch(tool_results.search_products)
      : [];

  const action_cards = isStorefront
    ? [
        ...buildActionCardsForIntent(intent_engine.primary, params.locale),
        ...buildEscalationActionCards(params.locale, emotion_trajectory.crisis_mode),
      ].filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i)
    : [];

  const persona_instruction = (
    isStorefront
      ? getStorefrontPersonaInstruction(
          active_personality,
          emotion_trajectory.crisis_mode,
          params.locale,
          params.personaPromptOverrides ?? {},
          prompt_variant,
        )
      : resolvePersonaInstruction(
          active_persona,
          params.locale,
          params.personaPromptOverrides ?? {},
          prompt_variant,
        )
  ).concat("\n\n", answer_style_instruction);

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
    for (const hook of seasonal_context.sales_hooks) {
      conversion_hints.push(hook);
    }
  }

  if (client_actions.length) {
    conversion_hints.push(
      `client_actions available (${client_actions.length}) — tell user they can tap the button to add to cart or apply promo.`,
    );
  }
  if (tool_results.promo_preview?.valid) {
    conversion_hints.push(
      `Promo ${tool_results.promo_preview.code} valid — discount ${tool_results.promo_preview.discount_egp ?? 0} EGP.`,
    );
  }
  if (tone_vector) {
    conversion_hints.push(toneVectorInstruction(tone_vector));
  }
  if (intent_engine.understanding_hint) {
    conversion_hints.push(`Message understanding: ${intent_engine.understanding_hint}`);
  }
  conversion_hints.push(emotionTrajectoryInstruction(emotion_trajectory));
  const occasionHint = giftOccasionHint(gift_occasion, params.locale);
  if (occasionHint) conversion_hints.push(occasionHint);
  if (knowledge_snippets.length) {
    const ragSource = knowledge_snippets[0]?.source ?? "keyword";
    conversion_hints.push(
      `FAQ snippets retrieved (${knowledge_snippets.length}, ${ragSource}) — cite if relevant; do not contradict.`,
    );
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
    active_persona,
    prompt_variant,
    sentiment_score,
    persona_preference,
    answer_style_preference,
    active_answer_style,
    answer_style_instruction,
    personality_instruction: getPersonalityModeInstruction(active_personality),
    persona_instruction,
    product_cards,
    action_cards,
    client_actions,
    emotion_trajectory,
    seasonal_context,
    tone_vector,
    knowledge_snippets,
    rag_source: rag_meta.rag_source,
    rag_hit_count: rag_meta.rag_hit_count,
    gift_occasion,
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
      "If confidence_pct >= 78, answer directly; if 50–77, brief answer + one question; if <50 or ambiguity, clarify first.",
      "Pick one string from follow_up_options as closing question when possible.",
      emotionTrajectoryInstruction(emotion_trajectory),
      seasonal_context.season_id !== "default"
        ? `Seasonal context: ${seasonal_context.label_en} — ${seasonal_context.proactive_offers.join(" ")}`
        : "",
    ].filter(Boolean),
    conversion_hints,
    supervisor: {
      enabled: true,
      post_critic: true,
      coach_env: "MR_BROWNIE_ENABLE_COACH",
    },
  };
}
