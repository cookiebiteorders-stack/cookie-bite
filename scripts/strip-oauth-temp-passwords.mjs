#!/usr/bin/env node
/**
 * Removes auto-generated temp passwords from OAuth users in Clerk.
 *
 * Usage:
 *   node scripts/strip-oauth-temp-passwords.mjs
 *   node scripts/strip-oauth-temp-passwords.mjs --limit=200
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnv();

const secret = process.env.CLERK_SECRET_KEY?.trim();
if (!secret) {
  console.error("CLERK_SECRET_KEY is required");
  process.exit(1);
}

const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;
const API = "https://api.clerk.com/v1";

async function clerk(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function shouldStrip(user) {
  if (!user.password_enabled) return false;
  if (!Array.isArray(user.external_accounts) || user.external_accounts.length === 0) {
    return false;
  }
  const meta = user.public_metadata ?? {};
  if (meta.password_set_by_user === true) return false;
  if (meta.oauth_temp_password_stripped === true) return false;
  return true;
}

async function stripUser(userId, publicMetadata) {
  const del = await clerk(`/users/${encodeURIComponent(userId)}/password`, {
    method: "DELETE",
  });
  if (!del.ok && del.status !== 404) {
    return { ok: false, error: `delete_${del.status}` };
  }
  const patch = await clerk(`/users/${encodeURIComponent(userId)}/metadata`, {
    method: "PATCH",
    body: JSON.stringify({
      public_metadata: {
        ...publicMetadata,
        oauth_temp_password_stripped: true,
        oauth_temp_password_stripped_at: new Date().toISOString(),
      },
    }),
  });
  if (!patch.ok) {
    return { ok: false, error: `metadata_${patch.status}` };
  }
  return { ok: true };
}

const report = { scanned: 0, stripped: 0, skipped: 0, failed: 0, errors: [] };
let offset = 0;
const pageSize = 100;

while (report.scanned < limit) {
  const list = await clerk(`/users?limit=${pageSize}&offset=${offset}`);
  if (!list.ok || !Array.isArray(list.json)) {
    console.error("Failed to list users", list.status, list.json);
    process.exit(1);
  }
  const users = list.json;
  if (users.length === 0) break;

  for (const user of users) {
    if (report.scanned >= limit) break;
    report.scanned += 1;
    if (!shouldStrip(user)) {
      report.skipped += 1;
      continue;
    }
    const result = await stripUser(user.id, user.public_metadata ?? {});
    if (result.ok) {
      report.stripped += 1;
      console.log(`stripped ${user.id}`);
    } else {
      report.failed += 1;
      report.errors.push({ userId: user.id, error: result.error });
    }
  }

  if (users.length < pageSize) break;
  offset += pageSize;
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.failed > 0 ? 1 : 0);
