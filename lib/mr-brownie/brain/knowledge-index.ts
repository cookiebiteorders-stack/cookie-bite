import { createHash } from "crypto";
import { buildStoreKnowledgeBase } from "@/lib/ai/store-faq-knowledge";
import type { AiCatalogProduct } from "@/lib/ai/website-knowledge";
import { loadAiWebsiteKnowledgeBundle } from "@/lib/ai/website-knowledge";
import { embedTexts } from "@/lib/mr-brownie/brain/embeddings";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type KnowledgeChunkRow = {
  source_type: "faq" | "policy" | "product";
  source_key: string | null;
  lang: string | null;
  chunk_text: string;
  question: string | null;
  answer: string | null;
  content_hash: string;
  embedding: number[] | null;
};

function hashContent(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function buildKnowledgeChunkRows(
  products: AiCatalogProduct[] = [],
  freeShippingThresholdEgp?: number,
): Omit<KnowledgeChunkRow, "embedding">[] {
  const kb = buildStoreKnowledgeBase(freeShippingThresholdEgp);
  const rows: Omit<KnowledgeChunkRow, "embedding">[] = [];

  for (const faq of kb.faq) {
    const chunk_text = `Q: ${faq.question}\nA: ${faq.answer}`;
    rows.push({
      source_type: "faq",
      source_key: `${faq.lang}:${faq.question.slice(0, 80)}`,
      lang: faq.lang,
      chunk_text,
      question: faq.question,
      answer: faq.answer,
      content_hash: hashContent(["faq", faq.lang, faq.question, faq.answer]),
    });
  }

  kb.policies.forEach((policy, i) => {
    rows.push({
      source_type: "policy",
      source_key: `policy:${i}`,
      lang: null,
      chunk_text: policy,
      question: null,
      answer: policy,
      content_hash: hashContent(["policy", String(i), policy]),
    });
  });

  for (const p of products) {
    const desc = (p.description ?? "").slice(0, 280);
    const dietary = p.dietary?.length ? ` Dietary: ${p.dietary.join(", ")}.` : "";
    const chunk_text = [
      p.name,
      p.name_ar ? `(${p.name_ar})` : "",
      desc,
      `${p.price_egp} EGP`,
      `Category: ${p.category}`,
      p.in_stock ? "In stock" : "Out of stock",
      dietary,
      p.shop_path,
    ]
      .filter(Boolean)
      .join(" — ");

    rows.push({
      source_type: "product",
      source_key: p.id,
      lang: null,
      chunk_text,
      question: p.name,
      answer: `${p.price_egp} EGP · ${p.shop_path}${desc ? ` · ${desc}` : ""}`,
      content_hash: hashContent(["product", p.id, p.name, String(p.price_egp)]),
    });
  }

  return rows;
}

/** يفهرس FAQ + السياسات + كتالوج المنتجات في pgvector. */
export async function syncKnowledgeChunks(): Promise<{
  ok: boolean;
  indexed: number;
  products: number;
  error?: string;
}> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { ok: false, indexed: 0, products: 0, error: "Database unavailable" };
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return { ok: false, indexed: 0, products: 0, error: "GEMINI_API_KEY missing" };
  }

  const { catalog, website } = await loadAiWebsiteKnowledgeBundle();
  const baseRows = buildKnowledgeChunkRows(
    catalog.products,
    website.delivery.free_threshold_egp,
  );
  const productCount = baseRows.filter((r) => r.source_type === "product").length;
  const embeddings = await embedTexts(baseRows.map((r) => r.chunk_text));

  const payload = baseRows
    .map((row, i) => ({
      ...row,
      embedding: embeddings[i],
      metadata: {
        source: row.source_type === "product" ? "product_catalog" : "site_translations",
      },
      updated_at: new Date().toISOString(),
    }))
    .filter((r) => r.embedding?.length);

  if (!payload.length) {
    return { ok: false, indexed: 0, products: 0, error: "No embeddings generated" };
  }

  await supabase.from("mr_brownie_knowledge_chunks").delete().neq("content_hash", "");

  const { error } = await supabase.from("mr_brownie_knowledge_chunks").insert(
    payload.map((p) => ({
      source_type: p.source_type,
      source_key: p.source_key,
      lang: p.lang,
      chunk_text: p.chunk_text,
      question: p.question,
      answer: p.answer,
      content_hash: p.content_hash,
      embedding: p.embedding,
      metadata: p.metadata,
      updated_at: p.updated_at,
    })),
  );

  if (error) return { ok: false, indexed: 0, products: 0, error: error.message };
  return { ok: true, indexed: payload.length, products: productCount };
}

/** يفهرس مرة واحدة إذا الجدول فارغ — في الخلفية دون حجب المحادثة. */
let knowledgeIndexAttempted = false;
let knowledgeIndexInFlight: Promise<void> | null = null;

export function ensureKnowledgeIndexed(): void {
  if (knowledgeIndexAttempted && !knowledgeIndexInFlight) return;
  if (knowledgeIndexInFlight) return;

  knowledgeIndexInFlight = (async () => {
    try {
      const supabase = tryCreateSupabaseAdminClient();
      if (!supabase || !process.env.GEMINI_API_KEY?.trim()) return;

      const { count } = await supabase
        .from("mr_brownie_knowledge_chunks")
        .select("id", { count: "exact", head: true });

      if (count && count > 0) {
        knowledgeIndexAttempted = true;
        return;
      }

      await syncKnowledgeChunks();
      knowledgeIndexAttempted = true;
    } catch (e) {
      console.error("[mr-brownie] background knowledge index failed", e);
      knowledgeIndexAttempted = true;
    } finally {
      knowledgeIndexInFlight = null;
    }
  })();
}
