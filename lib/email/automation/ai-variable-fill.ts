import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import { extractJsonObject } from "@/lib/admin/json-from-model";

const MAX_VAR_LENGTH = 280;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { expiresAt: number; value: Record<string, string> };
const fillCache = new Map<string, CacheEntry>();

function stripUnsafeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function sanitizeAiValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const stripped = stripUnsafeHtml(value);
  if (!stripped) return null;
  return stripped.slice(0, MAX_VAR_LENGTH);
}

function makeCacheKey(input: {
  templateName: string;
  templateVariables: string[];
  providedData: Record<string, unknown>;
  userData?: Record<string, unknown>;
  context: string;
}): string {
  return JSON.stringify({
    templateName: input.templateName,
    variables: input.templateVariables,
    providedData: input.providedData,
    userData: input.userData ?? {},
    context: input.context,
  });
}

function readCache(key: string): Record<string, string> | null {
  const entry = fillCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fillCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: Record<string, string>): void {
  fillCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function fillMissingTemplateVariablesWithAi(input: {
  templateName: string;
  templateVariables: string[];
  providedData: Record<string, unknown>;
  userData?: Record<string, unknown>;
  context: string;
}): Promise<Record<string, string>> {
  if (!input.templateVariables.length) return {};
  const cacheKey = makeCacheKey(input);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const promptPayload = JSON.stringify(
    {
      template_name: input.templateName,
      template_variables: input.templateVariables,
      provided_data: input.providedData,
      user_data: input.userData ?? {},
      context: input.context,
    },
    null,
    2,
  );

  const raw = await runMrBrownieGemini({
    systemInstruction:
      "Fill ONLY missing variables from the given list. Do NOT modify provided values. Do NOT create full email content. Do NOT add new keys. Do NOT invent order facts, prices, products, or identifiers. Return JSON object only.",
    messages: [
      {
        role: "user",
        content: `Fill ONLY the missing variables from this list. Do NOT change any provided values. Do NOT generate full email content. Only return JSON.\n${promptPayload}`,
      },
    ],
    temperature: 0.2,
    maxOutputTokens: 600,
  });

  const parsed = extractJsonObject(raw) ?? {};
  const allowed = new Set(input.templateVariables);
  const output: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (!allowed.has(k)) continue;
    const safe = sanitizeAiValue(v);
    if (!safe) continue;
    output[k] = safe;
  }
  writeCache(cacheKey, output);
  return output;
}
