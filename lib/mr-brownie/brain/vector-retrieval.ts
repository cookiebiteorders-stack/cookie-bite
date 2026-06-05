import { embedText } from "@/lib/mr-brownie/brain/embeddings";
import { retrieveKnowledgeSnippets } from "@/lib/mr-brownie/brain/knowledge-retrieval";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type KnowledgeSnippet = {
  question: string;
  answer: string;
  lang: string;
  similarity?: number;
  source?: "vector" | "keyword";
};

type VectorMatchRow = {
  question: string | null;
  answer: string | null;
  lang: string | null;
  chunk_text: string;
  similarity: number;
};

/** بحث pgvector — يُرجع [] عند غياب DB/embeddings. */
export async function retrieveVectorKnowledgeSnippets(
  query: string,
  locale: "ar" | "en" | "auto" = "auto",
  limit = 4,
): Promise<KnowledgeSnippet[]> {
  const q = query.trim();
  if (!q) return [];

  const embedding = await embedText(q);
  if (!embedding?.length) return [];

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];

  const filterLang = locale === "ar" || locale === "en" ? locale : null;

  const { data, error } = await supabase.rpc("match_mr_brownie_knowledge", {
    query_embedding: embedding,
    match_count: limit,
    match_threshold: 0.52,
    filter_lang: filterLang,
  });

  if (error) {
    console.error("[mr-brownie-rag] vector search failed", error);
    return [];
  }

  return ((data ?? []) as VectorMatchRow[]).map((row) => ({
    question: row.question?.trim() || row.chunk_text.slice(0, 120),
    answer: row.answer?.trim() || row.chunk_text,
    lang: row.lang ?? "any",
    similarity: row.similarity,
    source: "vector" as const,
  }));
}

/** هجين: pgvector أولاً، ثم keyword fallback. */
export async function retrieveKnowledgeHybrid(
  query: string,
  faq: Array<{ question: string; answer: string; lang: string }>,
  locale: "ar" | "en" | "auto" = "auto",
  limit = 4,
): Promise<KnowledgeSnippet[]> {
  const vector = await retrieveVectorKnowledgeSnippets(query, locale, limit);
  if (vector.length) return vector;

  return retrieveKnowledgeSnippets(query, faq, limit).map((s) => ({
    ...s,
    source: "keyword" as const,
  }));
}
