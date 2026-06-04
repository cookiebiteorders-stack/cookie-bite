import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { detectTrainingIntent } from "@/lib/mr-brownie/training/detect-intent";
import { SEED_TRAINING_EXAMPLES } from "@/lib/mr-brownie/training/seed-examples";
import type { FewShotExample, TrainingIntent } from "@/lib/mr-brownie/training/types";

const CACHE_TTL_MS = 180_000;
const MAX_IN_CONTEXT = 8;

let cachedDb: { expiresAt: number; rows: FewShotExample[] } | null = null;

function hasSupabaseConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url?.trim() && key?.trim());
}

async function loadDbExamples(): Promise<FewShotExample[]> {
  if (cachedDb && Date.now() < cachedDb.expiresAt) return cachedDb.rows;
  if (!hasSupabaseConfig()) return [];

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mr_brownie_training_examples")
    .select(
      "intent, locale, user_message, ideal_response, bad_response, weight, source",
    )
    .eq("is_active", true)
    .order("weight", { ascending: false })
    .limit(80);

  if (error) {
    console.error("[training] load examples", error);
    return [];
  }

  const rows: FewShotExample[] = (data ?? []).map((r) => ({
    intent: r.intent as TrainingIntent,
    locale: (r.locale === "ar" || r.locale === "en" ? r.locale : "any") as FewShotExample["locale"],
    user_message: String(r.user_message),
    ideal_response: String(r.ideal_response),
    bad_response: r.bad_response ? String(r.bad_response) : undefined,
    weight: Number(r.weight) || 1,
    source: (r.source as FewShotExample["source"]) || "manual",
  }));

  cachedDb = { expiresAt: Date.now() + CACHE_TTL_MS, rows };
  return rows;
}

function localeMatches(exampleLocale: FewShotExample["locale"], lang: "ar" | "en" | "auto"): boolean {
  if (exampleLocale === "any") return true;
  if (lang === "auto") return true;
  return exampleLocale === lang;
}

function scoreExample(
  ex: FewShotExample,
  intent: TrainingIntent,
  lang: "ar" | "en" | "auto",
): number {
  let score = ex.weight;
  if (ex.intent === intent) score += 10;
  else if (ex.intent === "general") score += 2;
  if (localeMatches(ex.locale, lang)) score += 3;
  return score;
}

export function invalidateTrainingExamplesCache(): void {
  cachedDb = null;
}

/**
 * Few-shot examples للحقن في CONTEXT — مرتبة حسب نية آخر رسالة مستخدم.
 */
export async function loadFewShotExamplesForChat(params: {
  lastUserMessage?: string;
  locale?: "ar" | "en" | "auto";
}): Promise<{
  detected_intent: TrainingIntent;
  examples: Array<{
    intent: string;
    user: string;
    ideal_response: string;
    avoid_style?: string;
  }>;
  note: string;
}> {
  const intent = detectTrainingIntent(params.lastUserMessage ?? "");
  const lang = params.locale ?? "auto";
  const pool = [...SEED_TRAINING_EXAMPLES, ...(await loadDbExamples())];

  const ranked = pool
    .map((ex) => ({ ex, score: scoreExample(ex, intent, lang) }))
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const picked: FewShotExample[] = [];
  for (const { ex } of ranked) {
    const key = `${ex.intent}:${ex.user_message.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(ex);
    if (picked.length >= MAX_IN_CONTEXT) break;
  }

  return {
    detected_intent: intent,
    examples: picked.map((ex) => ({
      intent: ex.intent,
      user: ex.user_message,
      ideal_response: ex.ideal_response,
      avoid_style: ex.bad_response,
    })),
    note: "Mirror structure and tone of examples; never copy product names/prices not in CONTEXT.products.",
  };
}
