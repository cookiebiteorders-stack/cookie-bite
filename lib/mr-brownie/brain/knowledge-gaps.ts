import type { KnowledgeSnippet } from "@/lib/mr-brownie/brain/vector-retrieval";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type RagSource = "vector" | "keyword" | "none";

export function resolveRagMeta(
  snippets: KnowledgeSnippet[],
  hasUserMessage: boolean,
): { rag_source: RagSource | null; rag_hit_count: number } {
  if (!hasUserMessage) return { rag_source: null, rag_hit_count: 0 };
  if (!snippets.length) return { rag_source: "none", rag_hit_count: 0 };
  const source = snippets[0]?.source === "vector" ? "vector" : "keyword";
  return { rag_source: source, rag_hit_count: snippets.length };
}

/** يُسجَّل عندما لا يعثر RAG على أي مقطع — للمراجعة في الأدمن. */
export async function recordKnowledgeGap(
  query: string,
  locale: "ar" | "en" | "auto",
): Promise<void> {
  const text = query.trim().slice(0, 500);
  if (!text) return;

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;

  const localeKey = locale === "ar" || locale === "en" ? locale : null;

  let lookup = supabase
    .from("mr_brownie_knowledge_gaps")
    .select("id, occurrence_count")
    .eq("query_text", text);
  lookup =
    localeKey === null ? lookup.is("locale", null) : lookup.eq("locale", localeKey);
  const { data: existing } = await lookup.maybeSingle();

  if (existing?.id) {
    await supabase
      .from("mr_brownie_knowledge_gaps")
      .update({
        occurrence_count: Number(existing.occurrence_count) + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("mr_brownie_knowledge_gaps").insert({
    query_text: text,
    locale: localeKey,
    occurrence_count: 1,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    resolved: false,
  });
}
