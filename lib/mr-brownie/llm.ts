import { encodeSseEvent } from "@/lib/ai-chat/stream-parser";
import { runMrBrownieDeepSeek, streamMrBrownieDeepSeek } from "@/lib/mr-brownie/deepseek";
import type { MrBrownieChatMessage } from "@/lib/mr-brownie/gemini";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import { streamMrBrownieGemini } from "@/lib/mr-brownie/gemini-stream";
import {
  getMrBrownieFallbackProvider,
  getMrBrownieLlmConfig,
  resolveMrBrownieLlmProvider,
  type MrBrownieLlmProvider,
} from "@/lib/mr-brownie/llm-provider";

export type MrBrownieLlmParams = {
  systemInstruction: string;
  messages: MrBrownieChatMessage[];
  temperature: number;
  maxOutputTokens: number;
};

function messagesHaveAttachments(messages: MrBrownieChatMessage[]): boolean {
  return messages.some((m) => (m.attachments?.length ?? 0) > 0);
}

/** DeepSeek lacks vision — prefer Gemini when images are attached. */
function resolveProviderForRequest(
  messages: MrBrownieChatMessage[],
): MrBrownieLlmProvider | null {
  if (messagesHaveAttachments(messages) && process.env.GEMINI_API_KEY?.trim()) {
    return "gemini";
  }
  return resolveMrBrownieLlmProvider();
}

async function runWithProvider(
  provider: MrBrownieLlmProvider,
  params: MrBrownieLlmParams,
): Promise<string> {
  if (provider === "deepseek") return runMrBrownieDeepSeek(params);
  return runMrBrownieGemini(params);
}

async function* streamWithProvider(
  provider: MrBrownieLlmProvider,
  params: MrBrownieLlmParams,
): AsyncGenerator<string> {
  if (provider === "deepseek") {
    yield* streamMrBrownieDeepSeek(params);
    return;
  }
  yield* streamMrBrownieGemini(params);
}

export async function runMrBrownieLlm(params: MrBrownieLlmParams): Promise<{
  text: string;
  provider: MrBrownieLlmProvider;
  model: string;
}> {
  const primary = resolveProviderForRequest(params.messages);
  if (!primary) {
    throw new Error(
      "No LLM API key configured — set DEEPSEEK_API_KEY or GEMINI_API_KEY",
    );
  }

  try {
    const text = await runWithProvider(primary, params);
    const { model } = getMrBrownieLlmConfig(primary);
    return { text, provider: primary, model };
  } catch (primaryError) {
    const fallback = getMrBrownieFallbackProvider(primary);
    if (!fallback) throw primaryError;

    console.warn(
      `[mr-brownie/llm] ${primary} failed, falling back to ${fallback}:`,
      primaryError,
    );
    const text = await runWithProvider(fallback, params);
    const { model } = getMrBrownieLlmConfig(fallback);
    return { text, provider: fallback, model };
  }
}

export type MrBrownieStreamHooks = {
  onComplete?: (fullText: string) => void | Promise<void>;
};

export function createMrBrownieStreamResponse(
  params: MrBrownieLlmParams,
  meta?: Record<string, unknown>,
  hooks?: MrBrownieStreamHooks,
): Response {
  const primary = resolveProviderForRequest(params.messages);
  if (!primary) {
    return Response.json(
      {
        error: {
          en: "No LLM API key configured — set DEEPSEEK_API_KEY or GEMINI_API_KEY",
          ar: "لم يُضبط مفتاح الذكاء الاصطناعي — أضف DEEPSEEK_API_KEY أو GEMINI_API_KEY",
        },
      },
      { status: 503 },
    );
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let usedProvider = primary;
      let usedModel = getMrBrownieLlmConfig(primary).model;

      const streamTokens = async function* (
        provider: MrBrownieLlmProvider,
      ): AsyncGenerator<string> {
        yield* streamWithProvider(provider, params);
      };

      try {
        let fullText = "";
        let streamed = false;

        try {
          for await (const token of streamTokens(primary)) {
            streamed = true;
            fullText += token;
            controller.enqueue(
              encoder.encode(encodeSseEvent({ type: "token", content: token })),
            );
          }
        } catch (primaryError) {
          const fallback = getMrBrownieFallbackProvider(primary);
          if (!fallback || streamed) throw primaryError;

          console.warn(
            `[mr-brownie/llm] ${primary} stream failed, falling back to ${fallback}:`,
            primaryError,
          );
          usedProvider = fallback;
          usedModel = getMrBrownieLlmConfig(fallback).model;
          fullText = "";

          for await (const token of streamTokens(fallback)) {
            fullText += token;
            controller.enqueue(
              encoder.encode(encodeSseEvent({ type: "token", content: token })),
            );
          }
        }

        if (!fullText.trim()) {
          try {
            const recovered = await runMrBrownieLlm(params);
            fullText = recovered.text.trim();
            usedProvider = recovered.provider;
            usedModel = recovered.model;
            if (fullText) {
              controller.enqueue(
                encoder.encode(encodeSseEvent({ type: "token", content: fullText })),
              );
            }
          } catch (recoverErr) {
            console.warn("[mr-brownie/llm] empty stream recovery failed:", recoverErr);
          }
        }

        try {
          await hooks?.onComplete?.(fullText);
        } catch (hookErr) {
          console.error("[mr-brownie/llm] onComplete hook failed (keeping streamed reply):", hookErr);
        }

        controller.enqueue(
          encoder.encode(
            encodeSseEvent({
              type: "done",
              meta: { provider: usedProvider, model: usedModel, ...meta },
            }),
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "LLM stream failed";
        try {
          const recovered = await runMrBrownieLlm(params);
          const text = recovered.text.trim();
          if (text) {
            controller.enqueue(
              encoder.encode(encodeSseEvent({ type: "token", content: text })),
            );
            try {
              await hooks?.onComplete?.(text);
            } catch (hookErr) {
              console.error("[mr-brownie/llm] onComplete after recovery failed:", hookErr);
            }
            controller.enqueue(
              encoder.encode(
                encodeSseEvent({
                  type: "done",
                  meta: {
                    provider: recovered.provider,
                    model: recovered.model,
                    recovered_from_stream_error: true,
                    ...meta,
                  },
                }),
              ),
            );
            return;
          }
        } catch (recoverErr) {
          console.warn("[mr-brownie/llm] stream error recovery failed:", recoverErr);
        }
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
