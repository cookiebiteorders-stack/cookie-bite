// Check if a user exists in Supabase auth and optionally create them
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
  console.log("Usage: node scripts/check-user.mjs <email>");
  process.exit(1);
}

const ref = new URL(SUPABASE_URL).hostname.split(".")[0];
const authEndpoint = `https://api.supabase.com/v1/projects/${ref}/auth/users`;

console.log(`Checking for user: ${email}`);

// Check if user exists
const checkRes = await fetch(authEndpoint, {
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
});

if (!checkRes.ok) {
  const text = await checkRes.text();
  console.error(`Failed to check users: ${checkRes.status}`, text);
  process.exit(1);
}

const users = await checkRes.json();
const existingUser = users.find(u => u.email.toLowerCase() === email);

if (existingUser) {
  console.log(`✓ User exists: ${existingUser.email}`);
  console.log(`  ID: ${existingUser.id}`);
  console.log(`  Created at: ${existingUser.created_at}`);
  console.log(`  Email confirmed: ${existingUser.email_confirmed_at ? 'Yes' : 'No'}`);
  console.log(`  Last sign in: ${existingUser.last_sign_in_at || 'Never'}`);
} else {
  console.log(`✗ User does not exist: ${email}`);
  console.log("\nTo create this user, run:");
  console.log(`node scripts/create-user.mjs ${email} <password>`);
}
