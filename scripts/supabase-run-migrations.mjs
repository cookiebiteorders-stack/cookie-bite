#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql via Supabase Management API.
 * Skips files already recorded in public.schema_migrations.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN
 *
 * Usage:
 *   node scripts/supabase-run-migrations.mjs
 *   node scripts/supabase-run-migrations.mjs --force=0019_invoices_payments_ensure.sql
 *   npm run supabase:migrate
 */
import fs from "node:fs";
import path from "node:path";
import {
  extractRows,
  getSupabaseManagementConfig,
  listMigrationFiles,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

const BOOTSTRAP_SQL = `
create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
`;

function parseArgs(argv) {
  const force = [];
  for (const arg of argv) {
    if (arg.startsWith("--force=")) {
      force.push(arg.slice("--force=".length));
    }
  }
  return { force };
}

async function fetchAppliedVersions() {
  try {
    const data = await runDatabaseQuery(
      `select version from public.schema_migrations order by version;`,
      { readOnly: true, label: "list-applied-migrations" },
    );
    const rows = extractRows(data);
    return new Set(rows.map((r) => String(r.version ?? r.VERSION ?? "")).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function recordMigration(version) {
  const safe = version.replace(/'/g, "''");
  await runDatabaseQuery(
    `insert into public.schema_migrations (version) values ('${safe}')
     on conflict (version) do nothing;`,
    { label: `record-${version}` },
  );
}

function isBenignError(message) {
  const m = message.toLowerCase();
  return (
    m.includes("already exists") ||
    m.includes("duplicate key") ||
    m.includes("does not exist, skipping")
  );
}

const projectRoot = process.cwd();
loadProjectEnv(projectRoot);
const { ref } = getSupabaseManagementConfig();
const { force } = parseArgs(process.argv.slice(2));

console.log(`[supabase:migrate] project ref=${ref}`);

await runDatabaseQuery(BOOTSTRAP_SQL, { label: "bootstrap-schema_migrations" });

const applied = await fetchAppliedVersions();
const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const files = listMigrationFiles(migrationsDir);

const failures = [];
let ran = 0;
let skipped = 0;

for (const name of files) {
  const rel = `supabase/migrations/${name}`;
  const filePath = path.join(migrationsDir, name);
  const sql = fs.readFileSync(filePath, "utf8").trim();
  if (!sql) {
    skipped += 1;
    continue;
  }

  const forceRun = force.includes(name);
  if (applied.has(name) && !forceRun) {
    console.log(`[supabase:migrate] skip (applied): ${name}`);
    skipped += 1;
    continue;
  }

  try {
    await runDatabaseQuery(sql, { label: rel });
    await recordMigration(name);
    applied.add(name);
    ran += 1;
    console.log(`[supabase:migrate] applied: ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isBenignError(msg)) {
      await recordMigration(name).catch(() => {});
      applied.add(name);
      ran += 1;
      console.log(`[supabase:migrate] applied (benign): ${name}`);
      continue;
    }
    failures.push({ file: rel, error: msg });
    console.error(`[supabase:migrate] FAILED: ${name}`);
  }
}

console.log(`[supabase:migrate] done — applied=${ran} skipped=${skipped} failed=${failures.length}`);

if (failures.length > 0) {
  for (const f of failures) {
    console.error(`  - ${f.file}\n    ${f.error.slice(0, 500)}`);
  }
  process.exit(1);
}
