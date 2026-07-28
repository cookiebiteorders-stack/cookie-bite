import { auth } from "@/lib/auth/supabase-auth";
import { cookies } from "next/headers";
import { AI_AGENT_IDS } from "@/lib/ai-agent/agents";
import { finalizeAgentResponse } from "@/lib/ai-agent/post-response";
import {
  prepareStorefrontAgentChat,
  storefrontAgentBodySchema,
} from "@/lib/ai-agent/prepare-storefront";
import type { CartLine } from "@/lib/cart/types";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import { createGeminiStreamResponse } from "@/lib/mr-brownie/gemini-stream";
import {
  isGuestSessionUuid,
  MR_BROWNIE_GUEST_SESSION_COOKIE,
} from "@/lib/mr-brownie/guest-session-constants";

export async function POST(req: Request) {
  const parsed = storefrontAgentBodySchema.safeParse(await req.json().catch(() => null));
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

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return Response.json(
      {
        error: {
          en: "GEMINI_API_KEY required for storefront agent (full brain pipeline).",
          ar: "مطلوب GEMINI_API_KEY لتشغيل مساعد المتجر الكامل.",
        },
      },
      { status: 503 },
    );
  }

  const { userId, user } = await auth();

  const jar = await cookies();
  const guestRaw = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
  const guestSessionId = isGuestSessionUuid(guestRaw) ? guestRaw : null;

  const prepared = await prepareStorefrontAgentChat({
    messages: parsed.data.messages,
    cartLines: (parsed.data.cart?.lines ?? []) as CartLine[],
    session: parsed.data.session,
    userId: userId ?? null,
    user: user ?? null,
  });

  return createGeminiStreamResponse(
    {
      systemInstruction: prepared.systemInstruction,
      messages: prepared.rawMessages,
      temperature: prepared.temperature,
      maxOutputTokens: prepared.maxOutputTokens,
    },
    { route: "api/chat", agent: AI_AGENT_IDS.STOREFRONT_CHAT },
    {
      onComplete: async (draft) => {
        await finalizeAgentResponse({
          agentId: AI_AGENT_IDS.STOREFRONT_CHAT,
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
            pageIntent: prepared.turnLogMeta.pageIntent,
            pathname: prepared.turnLogMeta.pathname,
            locale: prepared.turnLogMeta.locale,
            catalogTotal: prepared.turnLogMeta.catalogTotal,
            supabaseUserId: userId ?? null,
            guestSessionId,
          },
        });
      },
    },
  );
}
