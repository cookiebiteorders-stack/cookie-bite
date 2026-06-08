import { parseStreamResponse } from "@/lib/ai-chat/stream-parser";
import type { PersonaPreference } from "@/lib/mr-brownie/personas";
import type { AnswerStylePreference } from "@/lib/mr-brownie/answer-styles";

export type MrBrownieStreamCallbacks = {
  onToken: (fullText: string, delta: string) => void;
  onDone?: (meta?: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

export async function streamMrBrownieChat(params: {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    attachments?: Array<{ url: string }>;
  }>;
  cartLines: Array<{
    productId: string;
    name: string;
    priceEgp: number;
    quantity: number;
  }>;
  session?: {
    pathname: string;
    productSlug?: string;
    locale?: "ar" | "en" | "auto";
  };
  signal?: AbortSignal;
  persona?: PersonaPreference;
  answerStyle?: AnswerStylePreference;
  callbacks: MrBrownieStreamCallbacks;
}): Promise<string> {
  const res = await fetch("/api/mr-brownie/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      cart: { lines: params.cartLines },
      session: params.session,
      persona: params.persona,
      answer_style: params.answerStyle,
    }),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    const msg =
      data?.error?.ar ??
      data?.error?.en ??
      `Request failed (${res.status})`;
    params.callbacks.onError?.(msg);
    throw new Error(msg);
  }

  let fullText = "";
  for await (const event of parseStreamResponse(res.body)) {
    if (event.type === "token") {
      fullText += event.content;
      params.callbacks.onToken(fullText, event.content);
    } else if (event.type === "done") {
      params.callbacks.onDone?.(event.meta);
    } else if (event.type === "error") {
      params.callbacks.onError?.(event.message);
      throw new Error(event.message);
    }
  }

  return fullText;
}

export type MrBrownieNonStreamRequest = {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    attachments?: Array<{ url: string }>;
  }>;
  cartLines: Array<{
    productId: string;
    name: string;
    priceEgp: number;
    quantity: number;
  }>;
  session?: {
    pathname: string;
    productSlug?: string;
    locale?: "ar" | "en" | "auto";
  };
  persona?: PersonaPreference;
  answerStyle?: AnswerStylePreference;
};

/** Non-stream fallback when SSE fails — uses rule-based or full LLM endpoint. */
export async function fetchMrBrownieNonStreamReply(
  params: MrBrownieNonStreamRequest,
): Promise<{ reply: string; meta?: Record<string, unknown> } | null> {
  const res = await fetch("/api/mr-brownie/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      cart: { lines: params.cartLines },
      session: params.session,
      persona: params.persona,
      answer_style: params.answerStyle,
    }),
  });

  const data = (await res.json().catch(() => null)) as {
    reply?: string;
    meta?: Record<string, unknown>;
    error?: { en?: string; ar?: string };
  } | null;

  if (!res.ok || !data?.reply?.trim()) return null;
  return { reply: data.reply.trim(), meta: data.meta };
}
