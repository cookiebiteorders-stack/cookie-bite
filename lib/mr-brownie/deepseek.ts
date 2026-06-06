import OpenAI from "openai";
import type { MrBrownieChatMessage } from "@/lib/mr-brownie/gemini";
import { getMrBrownieLlmConfig } from "@/lib/mr-brownie/llm-provider";

function contentWithAttachmentNote(message: MrBrownieChatMessage): string {
  const count = message.attachments?.length ?? 0;
  if (!count) return message.content;
  const urls = message.attachments!.map((a) => a.url).join(", ");
  return `${message.content}\n\n[User attached ${count} image(s): ${urls}]`;
}

function toDeepSeekMessages(
  systemInstruction: string,
  messages: MrBrownieChatMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemInstruction },
    ...messages.map((m) => ({
      role: m.role,
      content: contentWithAttachmentNote(m),
    })),
  ];
}

function createDeepSeekClient(apiKey: string): OpenAI {
  const baseURL = process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
  return new OpenAI({ apiKey, baseURL });
}

export async function runMrBrownieDeepSeek(params: {
  systemInstruction: string;
  messages: MrBrownieChatMessage[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<string> {
  const { model, apiKey } = getMrBrownieLlmConfig("deepseek");
  const client = createDeepSeekClient(apiKey);

  const completion = await client.chat.completions.create({
    model,
    messages: toDeepSeekMessages(params.systemInstruction, params.messages),
    temperature: params.temperature,
    max_tokens: params.maxOutputTokens,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty DeepSeek response");
  return text;
}

export async function* streamMrBrownieDeepSeek(params: {
  systemInstruction: string;
  messages: MrBrownieChatMessage[];
  temperature: number;
  maxOutputTokens: number;
}): AsyncGenerator<string> {
  const { model, apiKey } = getMrBrownieLlmConfig("deepseek");
  const client = createDeepSeekClient(apiKey);

  const stream = await client.chat.completions.create({
    model,
    messages: toDeepSeekMessages(params.systemInstruction, params.messages),
    temperature: params.temperature,
    max_tokens: params.maxOutputTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content ?? "";
    if (content) yield content;
  }
}
