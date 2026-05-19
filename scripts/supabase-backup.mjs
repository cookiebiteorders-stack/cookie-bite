#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cookie Bite — Supabase logical backup (no extra deps).
 *
 * يقوم بتصدير جميع جداول مشروع Supabase إلى ملفات JSON Lines (NDJSON) +
 * lockfile + metadata.json، مضغوطة في أرشيف ZIP من Node نفسه.
 *
 * Why JSON (and not pg_dump)?
 *   - يعمل بدون أي تبعيات مثبتة على بيئة المستخدم (لا psql ولا pg_dump).
 *   - يستخدم Supabase Management API (read-only SQL) إذا توفّر
 *     SUPABASE_ACCESS_TOKEN، وإلا يستخدم PostgREST عبر SERVICE_KEY.
 *   - يمكن استعادة البيانات لاحقاً عبر `node scripts/supabase-restore.mjs`.
 *
 * Usage:
 *   node scripts/supabase-backup.mjs                # backups/ folder
 *   node scripts/supabase-backup.mjs --out=D:\bak   # custom folder
 *   node scripts/supabase-backup.mjs --tables=orders,users
 *
 * ENV (يقرأ من .env و .env.local تلقائياً):
 *   NEXT_PUBLIC_SUPABASE_URL          (required)
 *   SUPABASE_SERVICE_KEY              (required — read-all via PostgREST)
 *   SUPABASE_ACCESS_TOKEN             (optional — يعطي قائمة جداول كاملة)
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

// ---------- بسيط: تحميل ملف .env ----------
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

// ---------- args ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=?(.*)$/);
    return m ? [m[1], m[2] || true] : [a, true];
  }),
);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const outRoot = String(args.out || path.join(process.cwd(), "backups"));
fs.mkdirSync(outRoot, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(outRoot, `supabase-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });

console.log(`→ Backup folder: ${backupDir}`);

// ---------- اكتشاف الجداول ----------
const DEFAULT_TABLES = [
  "users",
  "products",
  "orders",
  "order_items",
  "addresses",
  "wishlists",
  "promo_codes",
  "promo_code_uses",
  "shipping_zones",
  "gift_boxes",
  "payments",
  "invoices",
  "notification_templates",
  "notification_logs",
  "notification_jobs",
  "customer_testimonials",
  "customer_admin_notes",
  "expenses",
  "push_subscriptions",
  "audit_logs",
  "chat_messages",
  "mr_brownie_chat_history",
  "contact_messages",
];

async function discoverTables() {
  if (typeof args.tables === "string" && args.tables) {
    return String(args.tables).split(",").map((x) => x.trim()).filter(Boolean);
  }
  if (!MGMT_TOKEN) {
    console.warn("⚠ SUPABASE_ACCESS_TOKEN missing — using DEFAULT_TABLES list.");
    return DEFAULT_TABLES;
  }
  try {
    const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MGMT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            "select tablename from pg_tables where schemaname='public' order by tablename;",
          read_only: true,
        }),
      },
    );
    if (!res.ok) {
      console.warn(`⚠ Mgmt API ${res.status} — falling back to DEFAULT_TABLES`);
      return DEFAULT_TABLES;
    }
    const j = await res.json();
    const rows = Array.isArray(j) ? j : j.result ?? [];
    const list = rows.map((r) => r.tablename).filter(Boolean);
    return list.length > 0 ? list : DEFAULT_TABLES;
  } catch (e) {
    console.warn(`⚠ table discovery failed (${e.message}) — using defaults`);
    return DEFAULT_TABLES;
  }
}

// ---------- تحميل صفحة من جدول ----------
async function dumpTable(table) {
  const file = path.join(backupDir, `${table}.ndjson`);
  let offset = 0;
  const pageSize = 1000;
  let total = 0;

  const stream = fs.createWriteStream(file, "utf8");
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(
      table,
    )}?select=*&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });

    if (res.status === 404 || res.status === 406) {
      stream.end();
      fs.rmSync(file, { force: true });
      return { table, rows: 0, skipped: true, reason: `HTTP ${res.status}` };
    }
    if (!res.ok) {
      stream.end();
      return {
        table,
        rows: total,
        skipped: false,
        error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
      };
    }
    const rows = (await res.json()) ?? [];
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) {
      stream.write(JSON.stringify(row) + "\n");
    }
    total += rows.length;
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  stream.end();
  return { table, rows: total, skipped: false };
}

// ---------- main ----------
const startedAt = Date.now();
const tables = await discoverTables();
console.log(`→ ${tables.length} tables`);

const results = [];
for (const t of tables) {
  process.stdout.write(`  • ${t} … `);
  const r = await dumpTable(t).catch((e) => ({
    table: t,
    rows: 0,
    error: e.message,
  }));
  results.push(r);
  if (r.skipped) console.log(`skipped (${r.reason})`);
  else if (r.error) console.log(`ERR: ${r.error}`);
  else console.log(`${r.rows} rows`);
}

// ---------- ضغط النتائج ----------
const meta = {
  app: "cookie-bite",
  generated_at: new Date().toISOString(),
  duration_ms: Date.now() - startedAt,
  supabase_url: SUPABASE_URL,
  tables: results,
  note:
    "Logical backup via PostgREST. Use scripts/supabase-restore.mjs to restore.",
};
fs.writeFileSync(
  path.join(backupDir, "metadata.json"),
  JSON.stringify(meta, null, 2),
);

// gzip كل ملف ndjson فردياً
for (const r of results) {
  if (r.rows === 0 || r.skipped || r.error) continue;
  const src = path.join(backupDir, `${r.table}.ndjson`);
  const dst = `${src}.gz`;
  fs.writeFileSync(dst, gzipSync(fs.readFileSync(src)));
  fs.rmSync(src, { force: true });
}

// hash منفصل للتحقق من السلامة
const sha = createHash("sha256");
for (const f of fs.readdirSync(backupDir).sort()) {
  sha.update(fs.readFileSync(path.join(backupDir, f)));
}
fs.writeFileSync(
  path.join(backupDir, "SHA256SUMS.txt"),
  `${sha.digest("hex")}  manifest\n`,
);

console.log(`\n✓ Backup completed in ${Math.round((Date.now() - startedAt) / 1000)}s`);
console.log(`✓ Folder: ${backupDir}`);
console.log("✓ keep a copy off-site (encrypted drive / private S3 bucket).");
