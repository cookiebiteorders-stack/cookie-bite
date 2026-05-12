// Runs local SQL migration files against Supabase using Management API.
// Endpoint: POST https://api.supabase.com/v1/projects/{ref}/database/query
//
// Requires in env:
// - NEXT_PUBLIC_SUPABASE_URL
// - SUPABASE_ACCESS_TOKEN

import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const txt = fs.readFileSync(filePath, "utf8");
  const lines = txt.split(/\r?\n/);
  for (const line of lines) {
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

function parseSupabaseRef(supabaseUrl) {
  const u = new URL(supabaseUrl);
  // hostname like: cgjrrpbknhwzppnpkojx.supabase.co
  const host = u.hostname.toLowerCase();
  const parts = host.split(".");
  if (parts.length < 3) throw new Error(`Unexpected host: ${host}`);
  return parts[0];
}

async function runSqlQuery({ endpoint, accessToken, sql, label }) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Supabase Mgmt API failed (${label}) status=${res.status}\n${text.slice(
        0,
        5000,
      )}`,
    );
  }
  console.log(`[migrations] ${label} -> ${res.status}`);
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!ACCESS_TOKEN) throw new Error("Missing SUPABASE_ACCESS_TOKEN");

const ref = parseSupabaseRef(SUPABASE_URL);
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

const migrationsDir = path.join(projectRoot, "supabase", "migrations");
const sqlFiles = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith(".sql"))
  .map((d) => `supabase/migrations/${d.name}`)
  .sort((a, b) => a.localeCompare(b, "en"));

const failures = [];

for (const rel of sqlFiles) {
  const filePath = path.join(projectRoot, rel);
  if (!fs.existsSync(filePath)) {
    failures.push({ file: rel, error: "missing file" });
    continue;
  }
  const sql = fs.readFileSync(filePath, "utf8");
  try {
    await runSqlQuery({
      endpoint,
      accessToken: ACCESS_TOKEN,
      sql,
      label: rel,
    });
  } catch (error) {
    failures.push({
      file: rel,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`[migrations] failed: ${rel}`);
  }
}

if (failures.length > 0) {
  console.error("[migrations] Completed with failures:");
  for (const f of failures) {
    console.error(`- ${f.file}: ${f.error}`);
  }
  process.exitCode = 1;
} else {
  console.log("[migrations] Done.");
}

