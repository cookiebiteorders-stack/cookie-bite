import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import { fetchImageInlineParts } from "@/lib/chat/image-attachments.server";
import type { ChatImageAttachment } from "@/lib/chat/image-attachments";

export type MrBrownieChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: ChatImageAttachment[];
};

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

export async function runMrBrownieGemini(params: {
  systemInstruction: string;
  /** التاريخ يبدأ بـ user وتنتهي بـ user */
  messages: MrBrownieChatMessage[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
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
  if (messages.length === 0) {
    throw new Error("messages required");
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
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
  const result = await chat.sendMessage(lastParts);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Empty model response");
  }
  return text;
}
