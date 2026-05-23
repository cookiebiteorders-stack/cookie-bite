import type { StreamEvent } from "@/lib/ai-chat/types";

/** يفكّ SSE أو نص خام إلى أحداث stream. */
export async function* parseStreamResponse(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;

        if (line.startsWith("data:")) {
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") {
            yield { type: "done" };
            continue;
          }
          try {
            const parsed = JSON.parse(payload) as StreamEvent;
            yield parsed;
          } catch {
            yield { type: "token", content: payload };
          }
          continue;
        }

        yield { type: "token", content: line };
      }
    }

    const tail = buffer.trim();
    if (tail) {
      if (tail.startsWith("data:")) {
        const payload = tail.slice(5).trim();
        if (payload && payload !== "[DONE]") {
          try {
            yield JSON.parse(payload) as StreamEvent;
          } catch {
            yield { type: "token", content: payload };
          }
        }
      } else {
        yield { type: "token", content: tail };
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function encodeSseEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
