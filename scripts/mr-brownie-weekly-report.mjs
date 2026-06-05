#!/usr/bin/env node
/**
 * تقرير Mr. Brownie الأسبوعي (stdout).
 * Usage: node scripts/mr-brownie-weekly-report.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - 7 * 86400_000).toISOString();

async function main() {
  const { data: turns } = await sb
    .from("mr_brownie_turn_logs")
    .select("intent, quality_score, rag_source")
    .gte("created_at", since);

  const { data: feedback } = await sb
    .from("mr_brownie_feedback")
    .select("rating")
    .gte("created_at", since);

  const { data: gaps } = await sb
    .from("mr_brownie_knowledge_gaps")
    .select("query_text, occurrence_count")
    .eq("resolved", false)
    .order("occurrence_count", { ascending: false })
    .limit(10);

  const rows = turns ?? [];
  const up = (feedback ?? []).filter((f) => f.rating === 1).length;
  const down = (feedback ?? []).filter((f) => f.rating === -1).length;
  let ragHits = 0;
  let ragMiss = 0;
  for (const t of rows) {
    if (t.rag_source === "vector" || t.rag_source === "keyword") ragHits += 1;
    else if (t.rag_source === "none") ragMiss += 1;
  }

  console.log("\n=== Mr. Brownie Weekly Report (7d) ===\n");
  console.log(`Turns: ${rows.length}`);
  console.log(`Feedback: 👍 ${up} / 👎 ${down}`);
  console.log(`RAG hits: ${ragHits} · misses: ${ragMiss}`);
  console.log("\nTop knowledge gaps:");
  for (const g of gaps ?? []) {
    console.log(`  ×${g.occurrence_count}  ${g.query_text}`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
