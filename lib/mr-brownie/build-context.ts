import type { UserRole } from "@/lib/admin/rbac";
import type { CartLine } from "@/lib/cart/types";
import { cartSubtotal } from "@/lib/cart/types";
import { buildStoreKnowledgeBase } from "@/lib/ai/store-faq-knowledge";
import { loadAiWebsiteKnowledgeBundle } from "@/lib/ai/website-knowledge";
import { fetchAdminAnalyticsSnapshot } from "@/lib/mr-brownie/analytics-snapshot";
import { buildMrBrownieAgentCapabilities } from "@/lib/mr-brownie/agent-capabilities";
import { fetchCustomerMemory } from "@/lib/mr-brownie/fetch-customer-memory";
import {
  buildCommerceClientActions,
  extractPromoCodeFromMessage,
  previewPromoForCart,
} from "@/lib/mr-brownie/brain/commerce-tools";
import { runIntentEngine } from "@/lib/mr-brownie/brain/intent-engine";
import { buildBrainPipelineMeta } from "@/lib/mr-brownie/brain/pipeline";
import { buildUserProfileSnapshot } from "@/lib/mr-brownie/brain/user-profile";
import { getActiveBehaviorRules } from "@/lib/mr-brownie/training/behavior-rules";
import { loadFewShotExamplesForChat } from "@/lib/mr-brownie/training/load-few-shot";
import {
  resolvePageIntent,
  type MrBrownieSessionContext,
} from "@/lib/mr-brownie/page-intent";
import { buildMrBrowniePermissions } from "@/lib/mr-brownie/permissions-context";
import { buildMrBrownieResponsePlaybook } from "@/lib/mr-brownie/response-playbook";
import { recordKnowledgeGap } from "@/lib/mr-brownie/brain/knowledge-gaps";
import { ensureKnowledgeIndexed } from "@/lib/mr-brownie/brain/knowledge-index";
import { retrieveKnowledgeHybrid } from "@/lib/mr-brownie/brain/vector-retrieval";
import { loadPublishedPersonaPrompts } from "@/lib/mr-brownie/persona-prompts";
import type { PersonaPreference } from "@/lib/mr-brownie/personas";
import type { AnswerStylePreference } from "@/lib/mr-brownie/answer-styles";
import { assignPromptVariant, type PromptVariant } from "@/lib/mr-brownie/prompt-variant";
import { loadToneVectorForUser } from "@/lib/mr-brownie/tone-vector";
import type { MrBrownieContextPayload } from "@/lib/mr-brownie/types";

export async function buildMrBrownieContext(params: {
  role: UserRole | "guest";
  userId: string | null;
  email: string | null;
  name: string | null;
  loyaltyTier: string | null;
  pastOrdersHint: string;
  cartLines: CartLine[];
  includeAdminData: boolean;
  session?: Partial<MrBrownieSessionContext> | null;
  dbUserId?: string | null;
  lastUserMessage?: string;
  conversationMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  personaPreference?: PersonaPreference;
  answerStylePreference?: AnswerStylePreference;
  supabaseUserId?: string | null;
  promptVariant?: PromptVariant;
}): Promise<MrBrownieContextPayload> {
  const locale =
    params.session?.locale === "ar" || params.session?.locale === "en"
      ? params.session.locale
      : "auto";

  const [
    { catalog, website, promoOffers },
    memory,
    few_shot_training,
    user_profile,
    personaPromptOverrides,
    toneVector,
  ] = await Promise.all([
    loadAiWebsiteKnowledgeBundle(),
    fetchCustomerMemory(params.dbUserId ?? null),
    loadFewShotExamplesForChat({
      lastUserMessage: params.lastUserMessage,
      locale,
    }),
    buildUserProfileSnapshot({
      dbUserId: params.dbUserId ?? null,
      displayName: params.name,
      loyaltyTier: params.loyaltyTier,
    }),
    loadPublishedPersonaPrompts(),
    loadToneVectorForUser(params.supabaseUserId ?? null),
  ]);

  const knowledgeRaw = buildStoreKnowledgeBase(website.delivery.free_threshold_egp);
  const session = params.session?.pathname
    ? resolvePageIntent(
        params.session.pathname,
        params.session.product_slug ?? null,
      )
    : resolvePageIntent("/");
  if (params.session?.locale === "ar" || params.session?.locale === "en") {
    session.locale = params.session.locale;
  }

  const knowledge_base = {
    ...knowledgeRaw,
    faq:
      session.locale === "ar"
        ? knowledgeRaw.faq.filter((f) => f.lang === "ar")
        : session.locale === "en"
          ? knowledgeRaw.faq.filter((f) => f.lang === "en")
          : knowledgeRaw.faq,
  };

  ensureKnowledgeIndexed();

  const faqForRetrieval = knowledge_base.faq.map((f) => ({
    question: f.question,
    answer: f.answer,
    lang: f.lang,
  }));

  const knowledgeSnippets = params.lastUserMessage?.trim()
    ? await retrieveKnowledgeHybrid(
        params.lastUserMessage,
        faqForRetrieval,
        session.locale,
        4,
      )
    : [];

  if (params.lastUserMessage?.trim() && knowledgeSnippets.length === 0) {
    void recordKnowledgeGap(params.lastUserMessage, session.locale);
  }

  const interimIntent = runIntentEngine({
    userMessage: params.lastUserMessage ?? "",
    pageIntent: session.page_intent,
  });

  const promoCode = extractPromoCodeFromMessage(params.lastUserMessage ?? "");
  let promoPreview: {
    code: string;
    valid: boolean;
    discount_egp: number | null;
    error_en?: string;
    error_ar?: string;
  } | null = null;
  if (promoCode) {
    const preview = await previewPromoForCart({
      code: promoCode,
      cartLines: params.cartLines,
    });
    promoPreview = {
      code: preview.code,
      valid: preview.valid,
      discount_egp: preview.discount_egp,
      error_en: preview.error_en,
      error_ar: preview.error_ar,
    };
  }

  const clientActions = await buildCommerceClientActions({
    intent: interimIntent.primary,
    userMessage: params.lastUserMessage ?? "",
    products: catalog.products,
    cartLines: params.cartLines,
    promoOffers: promoOffers,
    locale: session.locale,
  });

  const brain = buildBrainPipelineMeta({
    lastUserMessage: params.lastUserMessage,
    locale: session.locale,
    pathname: session.pathname,
    pageIntent: session.page_intent,
    products: catalog.products,
    cartLines: params.cartLines,
    role: params.role,
    conversationMessages: params.conversationMessages,
    memory,
    userProfile: user_profile
      ? {
          display_name: user_profile.display_name,
          favorite_product_names: user_profile.favorite_product_names,
          order_count: user_profile.order_count,
          budget_signal: user_profile.budget_signal,
          last_order_hint: user_profile.last_order_hint,
        }
      : null,
    loyaltyTier: params.loyaltyTier,
    personaPreference: params.personaPreference ?? "auto",
    answerStylePreference: params.answerStylePreference ?? "auto",
    personaPromptOverrides,
    promptVariant:
      params.promptVariant ??
      assignPromptVariant(
        params.supabaseUserId ?? params.dbUserId ?? params.userId ?? null,
      ),
    toneVector,
    faqEntries: faqForRetrieval,
    knowledgeSnippets,
    clientActions,
    promoPreview,
    freeShippingThresholdEgp: website.delivery.free_threshold_egp,
  });

  const behavior_rules = getActiveBehaviorRules();

  const subtotal = cartSubtotal(params.cartLines);
  const cart = {
    items: params.cartLines.map((l) => ({
      product_id: l.productId,
      name: l.name,
      quantity: l.quantity,
      line_total_egp: Math.round(l.priceEgp * l.quantity * 100) / 100,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    applied_promo: null,
  };

  const base: MrBrownieContextPayload = {
    user: {
      id: params.userId,
      role: params.role === "guest" ? "guest" : params.role,
      name: params.name,
      language: locale === "ar" || locale === "en" ? locale : "auto",
      loyalty_tier: params.loyaltyTier ?? "standard",
      past_orders_summary: params.pastOrdersHint || "No recent order history in context.",
    },
    products: catalog.products,
    catalog_meta: {
      total_active: catalog.total_active,
      shown_in_context: catalog.products.length,
      truncated: catalog.truncated,
      source: catalog.source,
      refreshed_at: website.generated_at,
      note: catalog.note,
    },
    website,
    cart,
    offers: promoOffers,
    knowledge_base,
    session,
    memory,
    user_profile: user_profile
      ? {
          display_name: user_profile.display_name,
          favorite_product_names: user_profile.favorite_product_names,
          order_count: user_profile.order_count,
          last_order_hint: user_profile.last_order_hint,
          budget_signal: user_profile.budget_signal,
          sales_hooks: user_profile.sales_hooks,
        }
      : null,
    behavior_rules: behavior_rules.map((r) => ({
      id: r.id,
      rule: r.rule,
      source: r.source,
    })),
    agent_capabilities: buildMrBrownieAgentCapabilities(params.role),
    brain,
    few_shot_training,
    permissions: buildMrBrowniePermissions(params.role),
    response_playbook: buildMrBrownieResponsePlaybook(params.role),
  };

  if (!params.includeAdminData) {
    return base;
  }

  const snap = await fetchAdminAnalyticsSnapshot();
  base.analytics = {
    note: snap
      ? undefined
      : "Operational analytics incomplete — verify Supabase connection or migrations.",
    today: {
      sessions: null,
      orders: snap?.today_orders ?? 0,
      revenue_egp: Math.round((snap?.today_revenue_egp ?? 0) * 100) / 100,
      conversion_rate: null,
    },
    week: {
      sessions: null,
      orders: snap?.week_orders ?? 0,
      revenue_egp: Math.round((snap?.week_revenue_egp ?? 0) * 100) / 100,
      top_products: snap?.top_product_names_week ?? [],
    },
    alerts: [],
  };

  base.orders = {
    recent_summary: "Use analytics.today and analytics.week for aggregates.",
    pending_count: snap?.pending_orders ?? null,
    abandoned_hint: null,
  };

  return base;
}
