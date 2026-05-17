#!/usr/bin/env node
/**
 * Full database + migration health check via Supabase APIs.
 *
 *   npm run supabase:healthcheck
 *   npm run supabase:healthcheck -- --fix
 *
 * Requires in .env / .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_KEY        (table probes via REST)
 *   SUPABASE_ACCESS_TOKEN       (migrations + SQL checks via Management API)
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

const root = process.cwd();
loadProjectEnv(root);

const fix = process.argv.includes("--fix");

const expectedPath = path.join(root, "supabase", "checks", "expected-app-tables.json");
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function section(title) {
  console.log(`\n=== ${title} ===\n`);
}

async function probeTablesRest() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn("Skip REST probes: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
    return { missing: expected, failed: [] };
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "count=exact",
  };

  const missing = [];
  const failed = [];

  for (const table of expected) {
    const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}?select=*&limit=0`;
    const res = await fetch(url, { method: "HEAD", headers });
    if (res.ok || res.status === 200 || res.status === 206) {
      console.log(`  OK   ${table}`);
      continue;
    }
    const text = await res.text().catch(() => "");
    const msg = `${res.status} ${text.slice(0, 200)}`;
    if (
      res.status === 404 ||
      text.toLowerCase().includes("does not exist") ||
      text.toLowerCase().includes("schema cache")
    ) {
      missing.push(table);
      console.log(`  MISS ${table} — ${msg}`);
    } else {
      failed.push({ table, msg });
      console.log(`  WARN ${table} — ${msg}`);
    }
  }

  return { missing, failed };
}

async function listTablesViaMgmt() {
  try {
    getSupabaseManagementConfig();
  } catch (e) {
    console.warn(String(e instanceof Error ? e.message : e));
    return null;
  }

  const sql = `
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
`;
  const data = await runDatabaseQuery(sql, { readOnly: true, label: "list-tables" });
  const rows = extractRows(data);
  return rows.map((r) => String(r.table_name ?? r.TABLE_NAME ?? ""));
}

async function listAppliedMigrations() {
  try {
    const data = await runDatabaseQuery(
      `select version, applied_at from public.schema_migrations order by version;`,
      { readOnly: true, label: "applied-migrations" },
    );
    return extractRows(data);
  } catch {
    return [];
  }
}

async function checkRlsHelper() {
  try {
    await runDatabaseQuery(`select public.is_admin_or_owner() as ok;`, {
      readOnly: true,
      label: "is_admin_or_owner",
    });
    console.log("  OK   is_admin_or_owner()");
    return true;
  } catch (e) {
    console.log(`  MISS is_admin_or_owner() — ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

function runScript(name, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", name), ...args], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${name} exit ${code}`))));
  });
}

section("1) App tables (PostgREST / service key)");
const { missing, failed } = await probeTablesRest();

section("2) Management API — public tables");
const liveTables = await listTablesViaMgmt();
if (liveTables) {
  const liveSet = new Set(liveTables);
  const missingFromInfo = expected.filter((t) => !liveSet.has(t));
  if (missingFromInfo.length) {
    console.log("Missing vs information_schema:", missingFromInfo.join(", "));
  } else {
    console.log("All expected app tables present in information_schema.");
  }
}

section("3) Applied migrations");
const applied = await listAppliedMigrations();
if (applied.length) {
  for (const row of applied) {
    console.log(`  ${row.version} @ ${row.applied_at ?? "?"}`);
  }
} else {
  console.log("  (no rows in schema_migrations — run npm run supabase:migrate)");
}

section("4) RLS helper");
const rlsOk = await checkRlsHelper();

const hasIssues = missing.length > 0 || failed.length > 0 || !rlsOk;

if (fix && hasIssues) {
  section("5) Applying fixes (supabase:ensure-schema)");
  try {
    await runScript("supabase-ensure-schema.mjs");
    section("6) Re-check tables");
    await probeTablesRest();
  } catch (e) {
    console.error("Fix failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  }
} else if (hasIssues) {
  console.log("\nIssues found. Run with --fix to apply migrations via Management API:");
  console.log("  npm run supabase:healthcheck -- --fix\n");
  process.exitCode = 1;
} else {
  console.log("\nDatabase healthcheck: OK\n");
}
