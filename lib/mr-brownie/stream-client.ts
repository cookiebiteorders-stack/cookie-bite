import { parseStreamResponse } from "@/lib/ai-chat/stream-parser";

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
  signal?: AbortSignal;
  callbacks: MrBrownieStreamCallbacks;
}): Promise<string> {
  const res = await fetch("/api/mr-brownie/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: params.messages,
      cart: { lines: params.cartLines },
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
