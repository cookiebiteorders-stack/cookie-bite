import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const txt = fs.readFileSync(filePath, "utf8");
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

function normalizeTableList(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.startsWith("{") && raw.endsWith("}")) {
    const inner = raw.slice(1, -1);
    if (!inner) return [];
    return inner.split(",").map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
  }
  return null;
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_ACCESS_TOKEN");
}

const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

const expectedPath = path.join(
  process.cwd(),
  "supabase",
  "checks",
  "expected-core-tables.json",
);
const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
if (!Array.isArray(expected) || expected.some((x) => typeof x !== "string")) {
  throw new Error("expected-core-tables.json must be a JSON string[]");
}

for (const t of expected) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(t)) {
    throw new Error(`Unsafe table name in snapshot manifest: ${t}`);
  }
}

const inList = expected.map((t) => `'${t}'`).join(", ");
const sql = `
select array_agg(table_name order by table_name) as tables
from information_schema.tables
where table_schema = 'public'
  and table_name in (${inList});
`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql, read_only: true }),
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  console.error("Non-JSON response:", text.slice(0, 2000));
  process.exit(1);
}

if (!res.ok) {
  console.error("Supabase API error:", res.status, text.slice(0, 4000));
  process.exit(1);
}

let rawTables =
  Array.isArray(data) && data[0]?.tables !== undefined
    ? data[0].tables
    : data?.[0]?.result?.[0]?.tables;

if (rawTables == null && data?.result) {
  const r = data.result;
  rawTables = Array.isArray(r) ? r[0]?.tables : r.tables;
}

const actual = normalizeTableList(rawTables);
if (!actual) {
  console.error("Unexpected API shape; raw:", JSON.stringify(data).slice(0, 4000));
  process.exit(1);
}

const expSorted = [...expected].sort();
const actSorted = [...actual].sort();
const missing = expSorted.filter((t) => !actSorted.includes(t));

if (missing.length) {
  console.error("Schema snapshot: missing core tables.");
  console.error("Expected:", expSorted.join(", "));
  console.error("Actual:", actSorted.join(", "));
  console.error("Missing:", missing.join(", "));
  process.exit(1);
}

console.log("schema-snapshot: OK — all", expected.length, "core tables present.");
