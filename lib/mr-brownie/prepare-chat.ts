import { z } from "zod";
import type { UserRole } from "@/lib/admin/rbac";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { buildMrBrownieContext } from "@/lib/mr-brownie/build-context";
import { getMrBrownieSystemInstruction } from "@/lib/mr-brownie/system-instruction";
import type { CartLine } from "@/lib/cart/types";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { CHAT_IMAGE_MAX_COUNT, isAllowedChatImageUrl } from "@/lib/chat/image-attachments";
import type { MrBrownieChatMessage } from "@/lib/mr-brownie/gemini";
import type { ChatActionCard } from "@/lib/mr-brownie/action-cards";
import type { ChatClientAction } from "@/lib/mr-brownie/chat-client-actions";
import type { ChatPersona, ChatProductCard, PersonaPreference } from "@/lib/mr-brownie/personas";
import type { AnswerStyle, AnswerStylePreference } from "@/lib/mr-brownie/answer-styles";

export const mrBrownieChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(12000),
        attachments: z
          .array(
            z.object({
              url: z.string().url().max(2000),
              mimeType: z.string().max(80).optional(),
              name: z.string().max(200).optional(),
            }),
          )
          .max(CHAT_IMAGE_MAX_COUNT)
          .optional(),
      }),
    )
    .min(1)
    .max(30),
  cart: z
    .object({
      lines: z
        .array(
          z.object({
            productId: z.string().min(1),
            name: z.string().min(1),
            priceEgp: z.number().nonnegative(),
            quantity: z.number().int().min(1).max(99),
          }),
        )
        .max(50),
    })
    .optional(),
  session: z
    .object({
      pathname: z.string().max(500).default("/"),
      productSlug: z.string().max(200).optional(),
      locale: z.enum(["ar", "en", "auto"]).optional(),
    })
    .optional(),
  /** المتجر: Mr. Brownie فقط — Mrs. Cookie في /admin/copilot */
  persona: z.enum(["auto", "mr_brownie"]).optional(),
  /** أسلوب الإجابة — friendly / concise / detailed / … */
  answer_style: z
    .enum(["auto", "friendly", "concise", "detailed", "enthusiastic", "calm", "expert"])
    .optional(),
  /** Supabase auth user (optional) */
  user: z
    .object({
      email: z.string().email().nullable().optional(),
      user_metadata: z
        .object({
          full_name: z.string().nullable().optional(),
          avatar_url: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

export function temperatureForRole(role: UserRole | "guest"): number {
  if (role === "guest" || role === "customer") return 0.7;
  if (role === "staff") return 0.25;
  return 0.2;
}

export function maxTokensForRole(role: UserRole | "guest"): number {
  if (role === "guest" || role === "customer") return 1500;
  return 3000;
}

export type MrBrowniePreparedChat = {
  resolvedRole: UserRole | "guest";
  rawMessages: MrBrownieChatMessage[];
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
  /** رسالة المستخدم الأخيرة بدون JSON السياق */
  lastUserMessagePlain: string;
  turnLogMeta: {
    intent: string;
    confidencePct: number;
    personalityMode: string;
    pageIntent: string;
    pathname: string;
    locale: string;
    catalogTotal: number;
    activePersona: ChatPersona;
    activeAnswerStyle: AnswerStyle;
    answerStylePreference: AnswerStylePreference;
    promptVariant: "a" | "b";
    ragSource: "vector" | "keyword" | "none" | null;
    ragHitCount: number;
    sentimentScore: number;
    followUpOptions: string[];
    productCards: ChatProductCard[];
    actionCards: ChatActionCard[];
    clientActions: ChatClientAction[];
  };
};

export async function prepareMrBrownieChat(params: {
  messages: z.infer<typeof mrBrownieChatBodySchema>["messages"];
  cartLines: CartLine[];
  userId: string | null;
  session?: z.infer<typeof mrBrownieChatBodySchema>["session"];
  user?: z.infer<typeof mrBrownieChatBodySchema>["user"];
  persona?: PersonaPreference;
  answerStyle?: AnswerStylePreference;
}): Promise<MrBrowniePreparedChat> {
  let resolvedRole: UserRole | "guest" = "guest";
  let email: string | null = null;
  let name: string | null = null;
  let dbUserId: string | null = null;
  let loyaltyTier: string | null = null;
  let pastOrdersHint = "";

  if (params.userId) {
    email = params.user?.email ?? null;
    name = params.user?.user_metadata?.full_name ?? email;

    resolvedRole = await resolveStaffRole({
      email,
      supabaseUserId: params.userId,
    });

    const supabase = tryCreateSupabaseAdminClient();
    if (supabase) {
      const { data: row } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", params.userId)
        .maybeSingle();
      if (row?.id) dbUserId = row.id as string;

      if (dbUserId) {
        const { data: loyalty } = await supabase
          .from("loyalty_accounts")
          .select("tier")
          .eq("user_id", dbUserId)
          .maybeSingle();
        if (loyalty?.tier) loyaltyTier = String(loyalty.tier);

        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", dbUserId);
        if (typeof count === "number") {
          pastOrdersHint = `${count} order(s) on record in Cookie Bite.`;
        }
      }
    }
  }

  const includeAdminData =
    resolvedRole === "owner" ||
    resolvedRole === "admin" ||
    resolvedRole === "staff";

  const sessionIn = params.session;
  const lastUserMessage = [...params.messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  const contextPayload = await buildMrBrownieContext({
    role: resolvedRole,
    userId: dbUserId ?? params.userId,
    dbUserId,
    email,
    name,
    loyaltyTier,
    pastOrdersHint,
    cartLines: params.cartLines,
    includeAdminData,
    session: sessionIn
      ? {
          pathname: sessionIn.pathname,
          product_slug: sessionIn.productSlug ?? null,
          locale: sessionIn.locale ?? "auto",
        }
      : null,
    lastUserMessage,
    conversationMessages: params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    personaPreference: params.persona ?? "auto",
    answerStylePreference: params.answerStyle ?? "auto",
    supabaseUserId: params.userId,
  });

  const contextJson = JSON.stringify(contextPayload);
  const systemInstruction = getMrBrownieSystemInstruction(
    resolvedRole,
    contextPayload.brain?.active_personality,
    contextPayload.session.locale,
    contextPayload.brain?.active_persona,
  );

  const rawMessages: MrBrownieChatMessage[] = params.messages.map((m, i, arr) => {
    const attachments = m.attachments?.filter((a) => isAllowedChatImageUrl(a.url));
    if (i !== arr.length - 1 || m.role !== "user") {
      return {
        role: m.role,
        content: m.content,
        attachments: attachments?.length ? attachments : undefined,
      };
    }
    return {
      role: "user" as const,
      content: `CONTEXT (JSON — authoritative role & data):\n${contextJson}\n\nUSER MESSAGE:\n${m.content}`,
      attachments: attachments?.length ? attachments : undefined,
    };
  });

  return {
    resolvedRole,
    rawMessages,
    systemInstruction,
    temperature: temperatureForRole(resolvedRole),
    maxOutputTokens: maxTokensForRole(resolvedRole),
    lastUserMessagePlain: lastUserMessage?.trim() ?? "",
    turnLogMeta: {
      intent: contextPayload.brain.intent_engine.primary,
      confidencePct: contextPayload.brain.intent_engine.confidence_pct,
      personalityMode: contextPayload.brain.active_personality,
      pageIntent: contextPayload.session.page_intent,
      pathname: contextPayload.session.pathname,
      locale: contextPayload.session.locale,
      catalogTotal: contextPayload.catalog_meta.total_active,
      activePersona: contextPayload.brain.active_persona,
      activeAnswerStyle: contextPayload.brain.active_answer_style,
      answerStylePreference: contextPayload.brain.answer_style_preference,
      promptVariant: contextPayload.brain.prompt_variant,
      ragSource: contextPayload.brain.rag_source,
      ragHitCount: contextPayload.brain.rag_hit_count,
      sentimentScore: contextPayload.brain.sentiment_score,
      followUpOptions: contextPayload.brain.follow_up_options,
      productCards: contextPayload.brain.product_cards,
      actionCards: contextPayload.brain.action_cards,
      clientActions: contextPayload.brain.client_actions,
    },
  };
}
