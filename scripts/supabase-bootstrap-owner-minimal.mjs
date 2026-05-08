// Minimal owner + loyalty bootstrap via Supabase Management API.
//
// Creates/ensures:
// - public.users.role = 'owner' for the email
// - public.loyalty_accounts table (expected by app code)
// - adds missing columns to existing public.loyalty_transactions table (expected by app code)
//
// This avoids running all migrations when the project already has partial/alternative schema.

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

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!ACCESS_TOKEN) throw new Error("Missing SUPABASE_ACCESS_TOKEN");

const email = (process.argv[2] ?? process.env.OWNER_BOOTSTRAP_EMAIL ?? "")
  .trim()
  .toLowerCase();

if (!email) throw new Error("Provide email arg or set OWNER_BOOTSTRAP_EMAIL");

const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

// Escape for SQL string literal
const emailSql = email.replace(/'/g, "''");

const sql = `
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid
  FROM public.users
  WHERE lower(email) = lower('${emailSql}')
  LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'User not found for email: ${emailSql}';
  END IF;

  UPDATE public.users
  SET role = 'owner'
  WHERE id = uid;
END $$;

-- Ensure enum types exist (safe if already created)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tier') THEN
    CREATE TYPE public.loyalty_tier AS ENUM ('cookie_lover','cruncher','cookie_monster');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_txn_type') THEN
    CREATE TYPE public.loyalty_txn_type AS ENUM ('earned','redeemed','bonus','expired');
  END IF;
END $$;

-- Create loyalty_accounts expected by app
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete cascade,
  total_points integer not null default 0,
  lifetime_points integer not null default 0,
  tier public.loyalty_tier not null default 'cookie_lover',
  referral_code text unique,
  referred_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Add columns expected by app into existing loyalty_transactions table
ALTER TABLE public.loyalty_transactions
  ADD COLUMN IF NOT EXISTS account_id uuid;

ALTER TABLE public.loyalty_transactions
  ADD COLUMN IF NOT EXISTS description_en text;

ALTER TABLE public.loyalty_transactions
  ADD COLUMN IF NOT EXISTS description_ar text;

-- Ensure loyalty row exists
INSERT INTO public.loyalty_accounts (user_id, total_points, lifetime_points, tier)
SELECT id, 0, 0, 'cookie_lover'
FROM public.users
WHERE lower(email) = lower('${emailSql}')
ON CONFLICT (user_id) DO NOTHING;
`;

const res = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql, read_only: false }),
});

const text = await res.text();
if (!res.ok) {
  throw new Error(
    `Bootstrap failed status=${res.status}\n${text.slice(0, 6000)}`,
  );
}

console.log(`[bootstrap-owner-minimal] Done for ${email}`);
console.log(text.slice(0, 2000));

