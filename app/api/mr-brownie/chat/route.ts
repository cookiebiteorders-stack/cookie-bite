import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getAiProductNamePool } from "@/lib/ai/website-knowledge";
import { AI_AGENT_IDS } from "@/lib/ai-agent/agents";
import { finalizeAgentResponse } from "@/lib/ai-agent/post-response";
import type { CommerceIntent } from "@/lib/mr-brownie/brain/intent-engine";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
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

    const { userId } = await auth();
    let clerkUser: Awaited<ReturnType<typeof currentUser>> = null;
    if (userId) {
      try {
        clerkUser = await currentUser();
      } catch (e) {
        console.error("[mr-brownie/chat] currentUser failed:", e);
      }
    }

    const prepared = await prepareMrBrownieChat({
      messages: parsed.data.messages,
      cartLines: (parsed.data.cart?.lines ?? []) as CartLine[],
      session: parsed.data.session,
      userId: userId ?? null,
      clerkUser,
    });

    let reply = "";
    let usedModel = process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";

    const jar = await cookies();
    const guestRaw = jar.get(MR_BROWNIE_GUEST_SESSION_COOKIE)?.value;
    const guestSessionId = isGuestSessionUuid(guestRaw) ? guestRaw : null;

    try {
      const draft = await runMrBrownieGemini({
        systemInstruction: prepared.systemInstruction,
        messages: prepared.rawMessages,
        temperature: prepared.temperature,
        maxOutputTokens: prepared.maxOutputTokens,
      });
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
          clerkUserId: userId,
          guestSessionId,
        },
      });
      reply = optimized.text;
    } catch (e) {
      console.error("Gemini API Error, falling back to local responses:", e);
      usedModel = "fallback-local-rules";

      const lastUserMsg = msgList[msgList.length - 1]?.content.toLowerCase() || "";
      const role = prepared.resolvedRole;

      if (lastUserMsg.includes("مرحبا") || lastUserMsg.includes("هلا") || lastUserMsg.includes("سلام")) {
        reply = "مرحباً بك! أنا مستر براوني 🐻، كيف يمكنني مساعدتك في طلب الكوكيز اليوم؟";
      } else if (lastUserMsg.includes("توصيل") || lastUserMsg.includes("شحن") || lastUserMsg.includes("متى")) {
        reply = "🚚 التوصيل مجاني للطلبات فوق 500 جنيه! وتصلك الكوكيز طازجة خلال 24-48 ساعة داخل القاهرة والجيزة.";
      } else if (lastUserMsg.includes("هدية") || lastUserMsg.includes("هدايا") || lastUserMsg.includes("مناسبة")) {
        reply =
          "🎁 للهدايا جرّب /gift-box أو صمّم صندوقك من /gift-box/build. هل تريد اقتراحات نكهات حسب المناسبة؟";
      } else if (lastUserMsg.includes("قهوة") || lastUserMsg.includes("كوفي") || lastUserMsg.includes("مشروب")) {
        reply =
          "☕ مع القهوة أنسب نكهات تشوكلت كلاسيك أو دارك من المتجر — أقترح لك 3 خيارات من الكتالوج الحالي إن رغبت.";
      } else if (
        lastUserMsg.includes("أكثر طلبا") ||
        lastUserMsg.includes("مشهور") ||
        lastUserMsg.includes("اكثر") ||
        lastUserMsg.includes("وين") ||
        lastUserMsg.includes("منتج") ||
        lastUserMsg.includes("كوكيز") ||
        lastUserMsg.includes("product")
      ) {
        const names = await getAiProductNamePool(4);
        reply =
          names.length > 0
            ? `🍪 عندنا منتجات على الموقع — جرّب مثلاً: ${names.join("، ")}. تصفّح الكل من /shop`
            : "🍪 تصفّح المتجر على /shop لاختيار الكوكيز والهدايا — الكتالوج محدّث من قاعدة البيانات.";
      } else if (lastUserMsg.includes("سعر") || lastUserMsg.includes("بكم") || lastUserMsg.includes("اسعار")) {
        reply = "💰 الأسعار في الكتالوج الحالي على /shop — أخبرني بميزانيتك وأقترح أنسب خيار.";
      } else if (role === "staff" || role === "admin" || role === "owner") {
        if (lastUserMsg.includes("طلبات") || lastUserMsg.includes("ملخص")) {
          reply =
            "📊 (وضع الاستجابة التلقائية): راجع لوحة الطلبات /admin/orders لأحدث الأرقام.";
        } else {
          reply = `مرحباً (${role}). تعذر الاتصال بـ Gemini — استخدم لوحة الإدارة أو Mrs. Cookie في /admin/copilot.`;
        }
      } else {
        reply =
          "عذراً، مشكلة مؤقتة في الاتصال بـ Gemini 🤖. جرّب السؤال عن التوصيل، الهدايا، أو منتجات /shop.";
      }
    }

    return NextResponse.json({
      reply,
      meta: {
        role: prepared.resolvedRole,
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
