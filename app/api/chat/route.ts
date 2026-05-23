import { z } from "zod";
import { createGeminiStreamResponse } from "@/lib/mr-brownie/gemini-stream";
import { createOpenAiStreamResponse } from "@/lib/ai-chat/providers/openai-stream";
import type { ChatApiMessage } from "@/lib/ai-chat/types";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(16000),
      }),
    )
    .min(1)
    .max(40),
  system: z.string().max(8000).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: { en: "Invalid payload", ar: "بيانات غير صالحة" } },
      { status: 400 },
    );
  }

  const apiMessages: ChatApiMessage[] = parsed.data.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const systemInstruction =
    parsed.data.system?.trim() ||
    "You are a helpful assistant for Cookie Bite. Reply in the user's language. Use Markdown when helpful.";

  if (process.env.OPENAI_API_KEY?.trim()) {
    const withSystem: ChatApiMessage[] = [
      { role: "user", content: `[System]\n${systemInstruction}` },
      ...apiMessages,
    ];
    return createOpenAiStreamResponse(withSystem);
  }

  if (process.env.GEMINI_API_KEY?.trim()) {
    return createGeminiStreamResponse(
      {
        systemInstruction,
        messages: apiMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      { route: "api/chat" },
    );
  }

  return Response.json(
    {
      error: {
        en: "No AI provider configured (OPENAI_API_KEY or GEMINI_API_KEY)",
        ar: "لم يُضبط مزود الذكاء الاصطناعي",
      },
    },
    { status: 503 },
  );
}
