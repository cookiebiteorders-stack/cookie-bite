#!/usr/bin/env node
/**
 * يعيد كتابة ردود ضعيفة من mr_brownie_turn_logs ويحفظها كـ training examples.
 *
 * Usage:
 *   node scripts/mr-brownie-rewrite-weak-logs.mjs
 *   node scripts/mr-brownie-rewrite-weak-logs.mjs --days 14 --max 8 --min-score 60
 *
 * يتطلب: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY?.trim();
const model =
  process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";

const daysArg = process.argv.includes("--days")
  ? Number(process.argv[process.argv.indexOf("--days") + 1])
  : 7;
const maxArg = process.argv.includes("--max")
  ? Number(process.argv[process.argv.indexOf("--max") + 1])
  : 8;
const minScoreArg = process.argv.includes("--min-score")
  ? Number(process.argv[process.argv.indexOf("--min-score") + 1])
  : 65;

const DAYS = Number.isFinite(daysArg) ? daysArg : 7;
const MAX = Number.isFinite(maxArg) ? maxArg : 8;
const MIN_SCORE = Number.isFinite(minScoreArg) ? minScoreArg : 65;

if (!url || !key) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

if (!geminiKey) {
  console.error("Missing GEMINI_API_KEY — cannot rewrite weak logs.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const since = new Date(Date.now() - DAYS * 86400_000).toISOString();

async function rewriteWithGemini(userMessage, weakReply, intent) {
  const prompt = `You improve e-commerce assistant replies for Cookie Bite (cookies/gifts, Egypt EGP).

User asked:
${userMessage}

Weak assistant reply:
${weakReply}

Intent: ${intent ?? "general"}

Write ONE improved assistant reply in the same language as the user (Arabic or English).
Rules: factual tone, 1 opener, bullets if comparing, one product/path suggestion, end with one follow-up question. No invented SKUs. Max 12 lines.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function main() {
  const { data: weak, error } = await sb
    .from("mr_brownie_turn_logs")
    .select(
      "id, user_message, assistant_message, intent, locale, quality_score, quality_issues",
    )
    .gte("created_at", since)
    .lt("quality_score", MIN_SCORE)
    .order("created_at", { ascending: false })
    .limit(MAX);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  if (!weak?.length) {
    console.log(`No weak turns (score < ${MIN_SCORE}) in last ${DAYS} days.`);
    return;
  }

  let saved = 0;
  for (const row of weak) {
    try {
      const ideal = await rewriteWithGemini(
        row.user_message,
        row.assistant_message,
        row.intent,
      );
      const locale =
        row.locale === "ar" || row.locale === "en"
          ? row.locale
          : /[\u0600-\u06FF]/.test(row.user_message)
            ? "ar"
            : "en";

      const { error: insErr } = await sb
        .from("mr_brownie_training_examples")
        .insert({
          intent: row.intent ?? "general",
          locale,
          user_message: row.user_message,
          ideal_response: ideal,
          source: "weak_log_rewrite",
          weight: 2,
          is_active: true,
        });

      if (insErr) {
        console.error("insert failed", row.id, insErr.message);
        continue;
      }
      saved++;
      console.log(`Rewrote log ${row.id} (score ${row.quality_score})`);
    } catch (e) {
      console.error("rewrite failed", row.id, e.message);
    }
  }

  console.log(`Done. ${saved}/${weak.length} examples added from weak logs.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
