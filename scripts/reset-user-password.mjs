// Reset a user's password in Supabase auth
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
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log("Usage: node scripts/reset-user-password.mjs <email> <new-password>");
  process.exit(1);
}

console.log(`Resetting password for: ${email}`);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Get user by email
const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

if (listError) {
  console.error("Error listing users:", listError);
  process.exit(1);
}

const user = users.find(u => u.email.toLowerCase() === email);

if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

// Update password
const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword
});

if (updateError) {
  console.error("Error updating password:", updateError);
  process.exit(1);
}

console.log(`✓ Password reset successfully for ${email}`);
console.log(`  User ID: ${user.id}`);
console.log(`  You can now sign in with the new password.`);
