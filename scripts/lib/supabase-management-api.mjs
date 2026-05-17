/**
 * Supabase Management API — POST /v1/projects/{ref}/database/query
 * @see https://supabase.com/docs/reference/api/v1-run-a-query
 */
import fs from "node:fs";
import path from "node:path";

export function loadProjectEnv(cwd = process.cwd()) {
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.local"));
}

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

export function parseSupabaseProjectRef(supabaseUrl) {
  const host = new URL(supabaseUrl).hostname.toLowerCase();
  const ref = host.split(".")[0];
  if (!ref) throw new Error(`Cannot parse project ref from URL: ${supabaseUrl}`);
  return ref;
}

export function getSupabaseManagementConfig() {
  loadProjectEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!accessToken) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN — create one at https://supabase.com/dashboard/account/tokens (scopes: database read/write)",
    );
  }
  const ref = parseSupabaseProjectRef(url);
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;
  return { ref, endpoint, accessToken, url };
}

/**
 * @returns {Promise<unknown>} Parsed JSON body
 */
export async function runDatabaseQuery(sql, options = {}) {
  const { endpoint, accessToken } = getSupabaseManagementConfig();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: sql,
      ...(options.readOnly ? { read_only: true } : {}),
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Supabase API non-JSON (${options.label ?? "query"}) status=${res.status}\n${text.slice(0, 2000)}`,
    );
  }

  if (!res.ok) {
    const detail =
      typeof data === "object" && data && "message" in data
        ? String(data.message)
        : text.slice(0, 4000);
    throw new Error(
      `Supabase API failed (${options.label ?? "query"}) status=${res.status}\n${detail}`,
    );
  }

  return data;
}

/** Flatten common Management API result shapes into row objects. */
export function extractRows(data) {
  if (Array.isArray(data)) {
    if (data.length && typeof data[0] === "object" && !Array.isArray(data[0])) {
      return data;
    }
    if (data[0]?.result) return extractRows(data[0].result);
  }
  if (data && typeof data === "object" && Array.isArray(data.result)) {
    return data.result;
  }
  return [];
}

export function listMigrationFiles(migrationsDir) {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".sql"))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "en"));
}
