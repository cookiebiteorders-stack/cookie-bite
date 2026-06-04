#!/usr/bin/env node
/**
 * تقرير تعلم Mr. Brownie: إحصائيات feedback + اقتراح ترقية لأمثلة few-shot.
 *
 * Usage:
 *   node scripts/mr-brownie-training-report.mjs
 *   node scripts/mr-brownie-training-report.mjs --promote-feedback <uuid>
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY
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
const promoteId = process.argv.includes("--promote-feedback")
  ? process.argv[process.argv.indexOf("--promote-feedback") + 1]
  : null;

async function report() {
  const { data: feedback, error } = await sb
    .from("mr_brownie_feedback")
    .select("id, rating, intent, created_at, promoted_example_id")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const rows = feedback ?? [];
  const up = rows.filter((r) => r.rating === 1);
  const down = rows.filter((r) => r.rating === -1);
  const unpromotedGood = up.filter((r) => !r.promoted_example_id);

  console.log("\n=== Mr. Brownie Training Report ===\n");
  console.log(`Total feedback: ${rows.length}`);
  console.log(`👍 Positive: ${up.length}`);
  console.log(`👎 Negative: ${down.length}`);
  console.log(`👍 Not yet promoted: ${unpromotedGood.length}`);

  const byIntent = {};
  for (const r of rows) {
    const k = r.intent ?? "unknown";
    byIntent[k] = byIntent[k] ?? { up: 0, down: 0 };
    if (r.rating === 1) byIntent[k].up++;
    else byIntent[k].down++;
  }
  console.log("\nBy intent:");
  for (const [intent, v] of Object.entries(byIntent)) {
    console.log(`  ${intent}: +${v.up} / -${v.down}`);
  }

  if (unpromotedGood.length) {
    console.log("\nRecent 👍 candidates for few-shot promotion:");
    for (const r of unpromotedGood.slice(0, 5)) {
      console.log(`  ${r.id}  intent=${r.intent}  at=${r.created_at}`);
    }
    console.log(
      "\nPromote: node scripts/mr-brownie-training-report.mjs --promote-feedback <id>",
    );
  }
}

async function promote(feedbackId) {
  const { data: row, error } = await sb
    .from("mr_brownie_feedback")
    .select("*")
    .eq("id", feedbackId)
    .maybeSingle();

  if (error || !row) {
    console.error("Feedback not found", error);
    process.exit(1);
  }
  if (row.rating !== 1) {
    console.error("Only positive feedback can be promoted.");
    process.exit(1);
  }

  const locale = /[\u0600-\u06FF]/.test(row.user_message) ? "ar" : "en";

  const { data: ex, error: insErr } = await sb
    .from("mr_brownie_training_examples")
    .insert({
      intent: row.intent ?? "general",
      locale,
      user_message: row.user_message,
      ideal_response: row.assistant_message,
      source: "feedback",
      weight: 2,
      is_active: true,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error(insErr);
    process.exit(1);
  }

  await sb
    .from("mr_brownie_feedback")
    .update({ promoted_example_id: ex.id })
    .eq("id", feedbackId);

  console.log(`Promoted feedback ${feedbackId} → example ${ex.id}`);
}

if (promoteId) {
  await promote(promoteId);
} else {
  await report();
}
