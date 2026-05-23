import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import {
  fetchImageInlineParts,
  type ChatImageAttachment,
} from "@/lib/chat/image-attachments";
import type { MrBrownieChatMessage } from "@/lib/mr-brownie/gemini";
import { encodeSseEvent } from "@/lib/ai-chat/stream-parser";

async function partsForUserMessage(
  text: string,
  attachments?: ChatImageAttachment[],
): Promise<Part[]> {
  const parts: Part[] = [{ text }];
  if (attachments?.length) {
    parts.push(...(await fetchImageInlineParts(attachments)));
  }
  return parts;
}

export async function* streamMrBrownieGemini(params: {
  systemInstruction: string;
  messages: MrBrownieChatMessage[];
  temperature: number;
  maxOutputTokens: number;
}): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const modelId =
    process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: params.systemInstruction,
  });

  const { messages } = params;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    throw new Error("Last message must be from user");
  }

  const history: Array<{ role: "user" | "model"; parts: Part[] }> = [];
  for (const m of messages.slice(0, -1)) {
    const role = m.role === "user" ? ("user" as const) : ("model" as const);
    if (m.role === "user" && m.attachments?.length) {
      history.push({
        role,
        parts: await partsForUserMessage(m.content, m.attachments),
      });
    } else {
      history.push({ role, parts: [{ text: m.content }] });
    }
  }

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
    },
  });

  const lastParts = await partsForUserMessage(last.content, last.attachments);
  const result = await chat.sendMessageStream(lastParts);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}

export function createGeminiStreamResponse(
  params: Parameters<typeof streamMrBrownieGemini>[0],
  meta?: Record<string, unknown>,
): Response {
  const encoder = new TextEncoder();
  const modelId =
    process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";

  const body = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamMrBrownieGemini(params)) {
          controller.enqueue(
            encoder.encode(encodeSseEvent({ type: "token", content: token })),
          );
        }
        controller.enqueue(
          encoder.encode(
            encodeSseEvent({
              type: "done",
              meta: { provider: "gemini", model: modelId, ...meta },
            }),
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Gemini stream failed";
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
