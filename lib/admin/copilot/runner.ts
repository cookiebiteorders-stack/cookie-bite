/**
 * Cookie Bite — Admin Copilot runner.
 *
 * Wires Gemini's function-calling loop:
 *   1. Send the conversation + tool declarations to Gemini.
 *   2. If Gemini responds with a `functionCall` part, execute the matching
 *      handler from `tools.ts`.
 *   3. Feed the `functionResponse` back to Gemini.
 *   4. Repeat until Gemini returns plain text OR we hit the safety cap.
 *
 * The runner stays generic: it doesn't know about specific tools — they're
 * declared in `tools.ts`. This keeps the surface area small + testable.
 */

import {
  GoogleGenerativeAI,
  type Content,
  type Part,
  type FunctionCall,
} from "@google/generative-ai";
import { TOOL_DECLARATIONS, runTool, type CopilotToolActor, type CopilotToolCall } from "@/lib/admin/copilot/tools";

export type CopilotMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CopilotRunResult = {
  reply: string;
  toolCalls: CopilotToolCall[];
};

const MAX_TOOL_ROUNDS = 8;

export async function runCopilot(opts: {
  systemInstruction: string;
  history: CopilotMessage[];
  userMessage: string;
  temperature?: number;
  actor: CopilotToolActor;
}): Promise<CopilotRunResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) throw new Error("GEMINI_API_KEY is not set");

  const modelId = process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: opts.systemInstruction,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
  });

  // Build initial conversation contents.
  const contents: Content[] = opts.history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));
  contents.push({ role: "user", parts: [{ text: opts.userMessage }] });

  const toolCalls: CopilotToolCall[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await model.generateContent({
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        maxOutputTokens: 2048,
      },
    });

    const response = result.response;
    const candidate = response.candidates?.[0];
    if (!candidate) break;

    const parts: Part[] = (candidate.content?.parts ?? []) as Part[];
    const functionCalls: FunctionCall[] = parts
      .map((p) => (p as { functionCall?: FunctionCall }).functionCall)
      .filter(Boolean) as FunctionCall[];

    if (functionCalls.length === 0) {
      // Final answer — Gemini returned plain text.
      const text = response.text();
      return { reply: text || "", toolCalls };
    }

    // Push the model's function-call turn into history so the next round can
    // reference it.
    contents.push({ role: "model", parts: parts as Part[] });

    // Execute each function call and append a functionResponse for each.
    const responseParts: Part[] = [];
    for (const call of functionCalls) {
      const args = (call.args ?? {}) as Record<string, unknown>;
      const exec = await runTool(call.name, args, opts.actor);
      toolCalls.push(exec);
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: exec.result as Record<string, unknown>,
        },
      } as Part);
    }
    contents.push({ role: "user", parts: responseParts });
  }

  // Safety stop — bail out gracefully.
  return {
    reply:
      "I ran out of tool-calling rounds before reaching a final answer. Please rephrase or narrow your question.",
    toolCalls,
  };
}
