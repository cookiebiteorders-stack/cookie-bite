import { runMrBrownieLlm } from "@/lib/mr-brownie/llm";
import {
  scoreAssistantResponse,
  type ResponseQualityReport,
} from "@/lib/mr-brownie/brain/response-quality";

export type { ResponseQualityReport } from "@/lib/mr-brownie/brain/response-quality";
export { scoreAssistantResponse } from "@/lib/mr-brownie/brain/response-quality";

const MIN_LEN = 40;
const MAX_LEN = 2400;

/** AI Coach — إعادة صياغة واحدة عند ضعف الرد (اختياري عبر env) */
export async function coachReviseResponse(params: {
  draft: string;
  userMessage: string;
  issues: string[];
}): Promise<string | null> {
  if (!process.env.MR_BROWNIE_ENABLE_COACH?.trim()) return null;

  try {
    const llmResult = await runMrBrownieLlm({
      systemInstruction: `You are a quality coach for Cookie Bite's Mr. Brownie.
Rewrite the DRAFT reply to fix these issues: ${params.issues.join(", ")}.
Rules: keep facts from draft; add one follow-up question; add 1–2 suggestions; stay concise; same language as user; max 2 emojis.`,
      messages: [
        {
          role: "user",
          content: `USER:\n${params.userMessage}\n\nDRAFT:\n${params.draft}`,
        },
      ],
      temperature: 0.35,
      maxOutputTokens: 900,
    });
    const revised = llmResult.text;
    const t = revised.trim();
    return t.length >= MIN_LEN ? t.slice(0, MAX_LEN) : null;
  } catch (e) {
    console.error("[response-optimizer] coach failed", e);
    return null;
  }
}

export async function optimizeAssistantResponse(params: {
  draft: string;
  userMessage: string;
  catalogTotal?: number;
}): Promise<{ text: string; quality: ResponseQualityReport; coached: boolean }> {
  let quality = scoreAssistantResponse(params.draft, {
    catalogTotal: params.catalogTotal,
    denyEmptyCatalog: true,
  });

  if (quality.pass) {
    return { text: params.draft.trim(), quality, coached: false };
  }

  const revised = await coachReviseResponse({
    draft: params.draft,
    userMessage: params.userMessage,
    issues: quality.issues,
  });

  if (!revised) {
    return { text: params.draft.trim(), quality, coached: false };
  }

  quality = scoreAssistantResponse(revised, {
    catalogTotal: params.catalogTotal,
    denyEmptyCatalog: true,
  });

  return { text: revised, quality, coached: true };
}
