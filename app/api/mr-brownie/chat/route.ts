import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { buildMrBrownieLocalFallbackReply } from "@/lib/mr-brownie/local-fallback-reply";
import { AI_AGENT_IDS } from "@/lib/ai-agent/agents";
import { finalizeAgentResponse } from "@/lib/ai-agent/post-response";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import { runMrBrownieLlm } from "@/lib/mr-brownie/llm";
import {
  isGuestSessionUuid,
  MR_BROWNIE_GUEST_SESSION_COOKIE,
} from "@/lib/mr-brownie/guest-session-constants";
import { mrBrownieChatBodySchema, prepareMrBrownieChat } from "@/lib/mr-brownie/prepare-chat";
import type { CartLine } from "@/lib/cart/types";

export async function POST(req: NextRequest) {
  try {
    const parsed = mrBrownieChatBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { en: "Invalid payload", ar: "بيانات غير صالحة" } },
        { status: 400 },
      );
    }

    const msgList = parsed.data.messages;
    if (msgList[0]?.role !== "user") {
      return NextResponse.json(
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

    const prepared = await prepareMrBrownieChat({
      messages: parsed.data.messages,
      cartLines: (parsed.data.cart?.lines ?? []) as CartLine[],
      session: parsed.data.session,
      userId: userId ?? null,
      user: authUser,
      persona: parsed.data.persona,
      answerStyle: parsed.data.answer_style,
    });

    let reply = "";
    let usedModel = "unknown";
    let usedProvider = "unknown";

    const jar = await cookies();
    const guestRaw = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
    const guestSessionId = isGuestSessionUuid(guestRaw) ? guestRaw : null;

    try {
      const llmResult = await runMrBrownieLlm({
        systemInstruction: prepared.systemInstruction,
        messages: prepared.rawMessages,
        temperature: prepared.temperature,
        maxOutputTokens: prepared.maxOutputTokens,
      });
      usedModel = llmResult.model;
      usedProvider = llmResult.provider;
      const draft = llmResult.text;
      const optimized = await finalizeAgentResponse({
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
      reply = optimized.text;
    } catch (e) {
      console.error("LLM API error, falling back to local responses:", e);
      usedModel = "fallback-local-rules";
      usedProvider = "fallback";

      reply = await buildMrBrownieLocalFallbackReply({
        lastUserMessage: msgList[msgList.length - 1]?.content ?? "",
        role: prepared.resolvedRole,
        locale: prepared.turnLogMeta.locale as "ar" | "en" | "auto",
      });
    }

    return NextResponse.json({
      reply,
      meta: {
        role: prepared.resolvedRole,
        provider: usedProvider,
        model: usedModel,
      },
    });
  } catch (e) {
    console.error("mr-brownie chat top-level error", e);
    return NextResponse.json(
      {
        error: {
          en: "Could not complete the reply.",
          ar: "تعذر إكمال الرد.",
        },
      },
      { status: 500 },
    );
  }
}
