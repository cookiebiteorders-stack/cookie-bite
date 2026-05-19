#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cookie Bite — Supabase logical restore.
 *
 * يستعيد جدولاً (أو كل الجداول) من backup أُنشئ بـ supabase-backup.mjs.
 * نتعامل مع NDJSON.gz عبر zlib المدمج في Node.
 *
 * SAFETY:
 *   - يطلب --confirm-prod صراحة قبل الكتابة على بيئة الإنتاج.
 *   - يستخدم upsert على PK ليتجاوز التضارب.
 *   - يكتب بـ batches صغيرة (200 row) لتفادي 413 (payload too large).
 *
 * Usage:
 *   node scripts/supabase-restore.mjs --from=backups/supabase-2026-... 
 *   node scripts/supabase-restore.mjs --from=... --tables=products,orders
 *   node scripts/supabase-restore.mjs --from=... --confirm-prod
 */

import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const txt = fs.readFileSync(file, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    const idx = raw.indexOf("=");
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    let value = raw.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [m[1], m[2] || true] : [a, true];
  }),
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const fromDir = args.from;
if (!fromDir || typeof fromDir !== "string") {
  console.error("✖ pass --from=backups/supabase-... folder");
  process.exit(1);
}

const isProd = /supabase\.co/.test(SUPABASE_URL) && process.env.NODE_ENV !== "development";
if (isProd && !args["confirm-prod"]) {
  console.error("✖ refusing to restore to production without --confirm-prod");
  process.exit(1);
}

const wanted = typeof args.tables === "string" && args.tables
  ? String(args.tables).split(",").map((x) => x.trim()).filter(Boolean)
  : null;

const files = fs
  .readdirSync(fromDir)
  .filter((f) => f.endsWith(".ndjson.gz"))
  .map((f) => ({ table: f.replace(/\.ndjson\.gz$/, ""), file: path.join(fromDir, f) }))
  .filter((x) => !wanted || wanted.includes(x.table));

if (files.length === 0) {
  console.error("✖ no NDJSON.gz files matched in", fromDir);
  process.exit(1);
}

async function restoreOne(table, gzPath) {
  const buf = gunzipSync(fs.readFileSync(gzPath));
  const lines = buf.toString("utf8").split("\n").filter(Boolean);
  if (lines.length === 0) return { table, rows: 0 };
  console.log(`  • ${table}: ${lines.length} rows`);

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < lines.length; i += BATCH) {
    const slice = lines.slice(i, i + BATCH).map((l) => JSON.parse(l));
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}`,
      {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(slice),
      },
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error(
        `    ✖ batch ${i / BATCH} failed (${res.status}): ${txt.slice(0, 200)}`,
      );
      continue;
    }
    inserted += slice.length;
  }
  return { table, rows: inserted };
}

console.log(`→ Restoring ${files.length} tables from ${fromDir}`);
const results = [];
for (const { table, file } of files) {
  results.push(await restoreOne(table, file).catch((e) => ({ table, error: e.message })));
}

console.log("\n— Summary —");
for (const r of results) console.log(`  ${r.table}: ${r.error ?? r.rows + " rows"}`);
console.log("\n✓ Restore done. Re-check counts manually before going live.");
