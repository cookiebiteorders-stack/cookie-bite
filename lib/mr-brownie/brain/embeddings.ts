import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

const EMBED_MODEL =
  process.env.MR_BROWNIE_EMBED_MODEL?.trim() || "text-embedding-004";

/** Gemini text-embedding-004 → 768 dimensions */
export async function embedText(
  text: string,
  taskType: TaskType = TaskType.RETRIEVAL_QUERY,
): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !text.trim()) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text: text.trim().slice(0, 2000) }] },
      taskType,
    });
    const values = result.embedding?.values;
    if (!values?.length) return null;
    return values;
  } catch (e) {
    console.error("[mr-brownie-embed] failed", e);
    return null;
  }
}

export async function embedTexts(
  texts: string[],
  taskType: TaskType = TaskType.RETRIEVAL_DOCUMENT,
): Promise<(number[] | null)[]> {
  const out: (number[] | null)[] = [];
  for (const t of texts) {
    out.push(await embedText(t, taskType));
  }
  return out;
}
