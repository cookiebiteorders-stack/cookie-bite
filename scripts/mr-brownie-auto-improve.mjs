#!/usr/bin/env node
/**
 * تحسين تلقائي أسبوعي لـ Mr. Brownie:
 * - يرقّي أفضل 👍 feedback إلى few-shot examples
 * - يُلخّص الردود الضعيفة 👎 للمراجعة
 *
 * Usage:
 *   node scripts/mr-brownie-auto-improve.mjs
 *   node scripts/mr-brownie-auto-improve.mjs --days 14 --max 15
 *
 * Cron (مثال أسبوعي):
 *   0 3 * * 0 cd /path/to/app && node scripts/mr-brownie-auto-improve.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const daysArg = process.argv.includes("--days")
  ? Number(process.argv[process.argv.indexOf("--days") + 1])
  : 7;
const maxArg = process.argv.includes("--max")
  ? Number(process.argv[process.argv.indexOf("--max") + 1])
  : 10;

const DAYS = Number.isFinite(daysArg) ? daysArg : 7;
const MAX_PROMOTE = Number.isFinite(maxArg) ? maxArg : 10;

if (!url || !key) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - DAYS * 86400_000).toISOString();

async function main() {
  const { data: good, error: gErr } = await sb
    .from("mr_brownie_feedback")
    .select("id, user_message, assistant_message, intent, created_at")
    .eq("rating", 1)
    .is("promoted_example_id", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_PROMOTE);

  if (gErr) {
    console.error(gErr);
    process.exit(1);
  }

  let promoted = 0;
  for (const row of good ?? []) {
    const locale = /[\u0600-\u06FF]/.test(row.user_message) ? "ar" : "en";
    const { data: ex, error: insErr } = await sb
      .from("mr_brownie_training_examples")
      .insert({
        intent: row.intent ?? "general",
        locale,
        user_message: row.user_message,
        ideal_response: row.assistant_message,
        source: "feedback",
        weight: 3,
        is_active: true,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("promote failed", row.id, insErr.message);
      continue;
    }

    await sb
      .from("mr_brownie_feedback")
      .update({ promoted_example_id: ex.id })
      .eq("id", row.id);

    promoted += 1;
    console.log(`Promoted ${row.id} → example ${ex.id}`);
  }

  const { data: bad, error: bErr } = await sb
    .from("mr_brownie_feedback")
    .select("id, intent, user_message, assistant_message, created_at")
    .eq("rating", -1)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (bErr) {
    console.error(bErr);
    process.exit(1);
  }

  console.log(`\n=== Auto-improve (${DAYS}d) ===`);
  console.log(`Promoted ${promoted} positive feedback rows to training examples.`);
  console.log(`Negative samples for review: ${(bad ?? []).length}`);
  for (const r of bad ?? []) {
    console.log(`  - [${r.intent}] ${r.user_message.slice(0, 60)}…`);
  }

  const { count: weakTurns } = await sb
    .from("mr_brownie_turn_logs")
    .select("id", { count: "exact", head: true })
    .lt("quality_score", 65)
    .gte("created_at", since);

  console.log(`Weak turns (score<65) logged: ${weakTurns ?? 0}`);
}

main();
