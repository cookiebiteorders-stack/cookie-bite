import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { CartLine } from "@/lib/cart/types";
import { AI_AGENT_IDS } from "@/lib/ai-agent/agents";
import { finalizeAgentResponse } from "@/lib/ai-agent/post-response";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import { createMrBrownieStreamResponse } from "@/lib/mr-brownie/llm";
import {
  isGuestSessionUuid,
  MR_BROWNIE_GUEST_SESSION_COOKIE,
} from "@/lib/mr-brownie/guest-session-constants";
import {
  mrBrownieChatBodySchema,
  prepareMrBrownieChat,
} from "@/lib/mr-brownie/prepare-chat";

export async function POST(req: NextRequest) {
  try {
    const parsed = mrBrownieChatBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return Response.json(
        { error: { en: "Invalid payload", ar: "بيانات غير صالحة" } },
        { status: 400 },
      );
    }

    const msgList = parsed.data.messages;
    if (msgList[0]?.role !== "user") {
      return Response.json(
        {
          error: {
            en: "Conversation must start with a user message.",
            ar: "يجب أن تبدأ المحادثة برسالة من المستخدم.",
          },
        },
        { status: 400 },
      );
    }

    const supabaseClient = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabaseClient.auth.getUser();
    const userId = authUser?.id;

    const jar = await cookies();
    const guestRaw = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
    const guestSessionId = isGuestSessionUuid(guestRaw) ? guestRaw : null;

    const prepared = await prepareMrBrownieChat({
      messages: parsed.data.messages,
      cartLines: (parsed.data.cart?.lines ?? []) as CartLine[],
      session: parsed.data.session,
      userId: userId ?? null,
      user: authUser,
      persona: parsed.data.persona,
      answerStyle: parsed.data.answer_style,
    });

    return createMrBrownieStreamResponse(
      {
        systemInstruction: prepared.systemInstruction,
        messages: prepared.rawMessages,
        temperature: prepared.temperature,
        maxOutputTokens: prepared.maxOutputTokens,
      },
      {
        role: prepared.resolvedRole,
        persona: prepared.turnLogMeta.activePersona,
        answer_style: prepared.turnLogMeta.activeAnswerStyle,
        prompt_variant: prepared.turnLogMeta.promptVariant,
        sentiment_score: prepared.turnLogMeta.sentimentScore,
        follow_up_options: prepared.turnLogMeta.followUpOptions,
        product_cards: prepared.turnLogMeta.productCards,
        action_cards: prepared.turnLogMeta.actionCards,
        client_actions: prepared.turnLogMeta.clientActions,
      },
      {
        onComplete: async (draft) => {
          await finalizeAgentResponse({
            agentId: AI_AGENT_IDS.MR_BROWNIE,
            draft,
            userMessage: prepared.lastUserMessagePlain,
            intent: prepared.turnLogMeta.intent as CommerceIntent,
            confidencePct: prepared.turnLogMeta.confidencePct,
            locale: prepared.turnLogMeta.locale as "ar" | "en" | "auto",
            catalogTotal: prepared.turnLogMeta.catalogTotal,
            turnLog: {
              intent: prepared.turnLogMeta.intent,
              confidencePct: prepared.turnLogMeta.confidencePct,
              personalityMode: prepared.turnLogMeta.personalityMode,
              activePersona: prepared.turnLogMeta.activePersona,
              promptVariant: prepared.turnLogMeta.promptVariant,
              ragSource: prepared.turnLogMeta.ragSource,
              ragHitCount: prepared.turnLogMeta.ragHitCount,
              sentimentScore: prepared.turnLogMeta.sentimentScore,
              pageIntent: prepared.turnLogMeta.pageIntent,
              pathname: prepared.turnLogMeta.pathname,
              locale: prepared.turnLogMeta.locale,
              catalogTotal: prepared.turnLogMeta.catalogTotal,
              supabaseUserId: userId,
              guestSessionId,
            },
          });
        },
      },
    );
  } catch (e) {
    console.error("mr-brownie chat stream error", e);
    return Response.json(
      {
        error: {
          en: "Could not start stream.",
          ar: "تعذر بدء البث.",
        },
      },
      { status: 500 },
    );
  }
}
