import OpenAI from "openai";
import type { ChatApiMessage } from "@/lib/ai-chat/types";
import { encodeSseEvent } from "@/lib/ai-chat/stream-parser";

export async function createOpenAiStreamResponse(
  messages: ChatApiMessage[],
  model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini",
): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: { en: "OPENAI_API_KEY not configured", ar: "مفتاح OpenAI غير مضبوط" },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? "";
          if (content) {
            controller.enqueue(
              encoder.encode(encodeSseEvent({ type: "token", content })),
            );
          }
        }
        controller.enqueue(
          encoder.encode(encodeSseEvent({ type: "done", meta: { provider: "openai", model } })),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "OpenAI stream failed";
        controller.enqueue(
          encoder.encode(encodeSseEvent({ type: "error", message })),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
