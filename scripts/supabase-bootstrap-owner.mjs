// Bootstrap cookie-bite owner via Supabase REST (service role).
// Updates:
// - public.users.role = 'owner' for a given email
// - public.loyalty_accounts row exists for that user (so benefits/pages don't 404)
//
// Reads env from .env and .env.local (simple parser).

import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const txt = fs.readFileSync(filePath, "utf8");
  const lines = txt.split(/\r?\n/);
  for (const line of lines) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    // split on first '=' only (values may contain '=')
    const idx = raw.indexOf("=");
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    let value = raw.slice(idx + 1).trim();
    // remove surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env/.env.local");
}
if (!SUPABASE_SERVICE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_KEY in .env/.env.local");
}

const EMAIL = process.env.OWNER_BOOTSTRAP_EMAIL ?? "cookie.bite.orders@gmail.com";
const EMAIL_NORMALIZED = EMAIL.trim().toLowerCase();

const authHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function supaFetch(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders, ...(options?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Supabase REST error (${res.status}) calling ${url}:\n${text}`,
    );
  }
  if (!text) return null;
  return JSON.parse(text);
}

// 1) Find user by email (case-insensitive)
const usersUrl =
  `${SUPABASE_URL}/rest/v1/users` +
  `?email=ilike.${encodeURIComponent(EMAIL_NORMALIZED)}` +
  `&select=id, email, role`;

console.log(`[bootstrap-owner] Looking up user by email: ${EMAIL_NORMALIZED}`);
const users = await supaFetch(usersUrl, { method: "GET" });
const user = Array.isArray(users) ? users[0] : null;

if (!user) {
  console.log(
    `[bootstrap-owner] No user found in public.users for ${EMAIL_NORMALIZED}. ` +
      `Run: login once to /account (or wait for Clerk webhook).`,
  );
  process.exit(2);
}

const userId = user.id;
console.log(`[bootstrap-owner] Found user_id=${userId}, current role=${user.role}`);

// 2) Update role to owner
const updateUrl = `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`;
const updatedUsers = await supaFetch(updateUrl, {
  method: "PATCH",
  body: JSON.stringify({ role: "owner" }),
});
console.log(`[bootstrap-owner] Role updated. Result:`, updatedUsers?.[0]?.role ?? "ok");

// 3) Ensure loyalty account exists (upsert by user_id)
const loyaltyUrl = `${SUPABASE_URL}/rest/v1/loyalty_accounts?on_conflict=user_id`;
const existingOrInserted = await supaFetch(loyaltyUrl, {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates, return=representation" },
  body: JSON.stringify({
    user_id: userId,
    total_points: 0,
    lifetime_points: 0,
    tier: "cookie_lover",
  }),
});

console.log(
  `[bootstrap-owner] Loyalty account ensured. data:`,
  Array.isArray(existingOrInserted) ? existingOrInserted[0] : existingOrInserted,
);

console.log("[bootstrap-owner] Done.");

