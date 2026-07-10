// Check if a user exists using Supabase client directly
import { createClient } from '@supabase/supabase-js';
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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!SERVICE_KEY) throw new Error("Missing SUPABASE_SERVICE_KEY");

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email) {
  console.log("Usage: node scripts/check-user-direct.mjs <email>");
  process.exit(1);
}

console.log(`Checking for user: ${email}`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Check auth.users
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.error("Error checking auth users:", authError);
  process.exit(1);
}

const authUser = authUsers.users.find(u => u.email.toLowerCase() === email);

if (authUser) {
  console.log(`✓ User exists in auth: ${authUser.email}`);
  console.log(`  ID: ${authUser.id}`);
  console.log(`  Created at: ${authUser.created_at}`);
  console.log(`  Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
  console.log(`  Last sign in: ${authUser.last_sign_in_at || 'Never'}`);
} else {
  console.log(`✗ User does not exist in auth: ${email}`);
}

// Check public.users
const { data: publicUser, error: publicError } = await supabase
  .from('users')
  .select('*')
  .ilike('email', email)
  .single();

if (!publicError && publicUser) {
  console.log(`✓ User exists in public.users: ${publicUser.email}`);
  console.log(`  ID: ${publicUser.id}`);
  console.log(`  Role: ${publicUser.role}`);
} else if (publicError && publicError.code !== 'PGRST116') {
  console.log(`Note: Could not check public.users: ${publicError.message}`);
} else {
  console.log(`✗ User does not exist in public.users: ${email}`);
}
