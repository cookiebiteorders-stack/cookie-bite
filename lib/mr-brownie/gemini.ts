import { GoogleGenerativeAI } from "@google/generative-ai";

export async function runMrBrownieGemini(params: {
  systemInstruction: string;
  /** التاريخ يبدأ بـ user وتنتهي بـ user */
  messages: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const modelId =
    process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-2.0-flash";

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

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
    },
  });

  const result = await chat.sendMessage(last.content);
  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error("Empty model response");
  }
  return text;
}
