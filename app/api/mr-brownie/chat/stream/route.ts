import { NextRequest } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { CartLine } from "@/lib/cart/types";
import { createGeminiStreamResponse } from "@/lib/mr-brownie/gemini-stream";
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

    const { userId } = await auth();
    let clerkUser: Awaited<ReturnType<typeof currentUser>> = null;
    if (userId) {
      try {
        clerkUser = await currentUser();
      } catch (e) {
        console.error("[mr-brownie/chat/stream] currentUser failed:", e);
      }
    }

    const prepared = await prepareMrBrownieChat({
      messages: parsed.data.messages,
      cartLines: (parsed.data.cart?.lines ?? []) as CartLine[],
      userId: userId ?? null,
      clerkUser,
    });

    return createGeminiStreamResponse(
      {
        systemInstruction: prepared.systemInstruction,
        messages: prepared.rawMessages,
        temperature: prepared.temperature,
        maxOutputTokens: prepared.maxOutputTokens,
      },
      { role: prepared.resolvedRole },
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
