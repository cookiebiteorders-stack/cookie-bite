#!/usr/bin/env node
/**
 * Actionable Hostinger deploy checklist (stdout only — no secrets written).
 * Usage: npm run hostinger:checklist
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DOMAIN = "cookie-bite.com";
const ORIGIN = `https://${DOMAIN}`;

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "APP_BASE_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
  "PAYMOB_API_KEY",
  "PAYMOB_INTEGRATION_ID_CARD",
  "PAYMOB_INTEGRATION_ID_WALLET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "INTERNAL_API_SECRET",
  "REVALIDATE_SECRET",
];

function loadEnvFile(file) {
  const p = resolve(root, file);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1).replace(/^["']|["']$/g, "");
    if (!(k in process.env)) process.env[k] = v;
  }
}

function hasValue(key) {
  const v = process.env[key]?.trim();
  return Boolean(v && !v.includes("REPLACE_ME") && !v.startsWith("__SET_IN_"));
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const missing = REQUIRED.filter((k) => !hasValue(k));
if (!process.env.PAYMOB_HMAC_SECRET?.trim() && !process.env.PAYMOB_HMAC?.trim()) {
  missing.push("PAYMOB_HMAC_SECRET");
}

const internalSet = hasValue("INTERNAL_API_SECRET");

console.log(`
=== Cookie Bite — Hostinger sync checklist (${DOMAIN}) ===

1) Environment (hPanel → Websites → ${DOMAIN} → Node.js → Environment variables)
   - Run locally: npm run hostinger:env-audit  → imports hostinger-production.env (gitignored)
   - Keep COOKIE_BITE_FAIL_ON_MISSING_ENV=false until all keys below are set, then redeploy
   - Missing locally (${missing.length}): ${missing.length ? missing.join(", ") : "none ✓"}

2) Build & start (hostinger.nodejs.json)
   - buildCommand: npm run build
   - startCommand: npm run start  (server.mjs → standalone server.js)
   - Node 20+, NODE_ENV=production

3) Clerk Dashboard
   - Primary domain: ${DOMAIN}
   - Webhook: ${ORIGIN}/api/webhooks/clerk
   - Redirects: ${ORIGIN}/sign-in, /sign-up, /sso-callback, /account

4) Supabase → Authentication → URL configuration
   - Site URL: ${ORIGIN}
   - Redirect URLs: same as Clerk paths above

5) Paymob
   - Webhook: ${ORIGIN}/api/webhooks/paymob
   - Return: ${ORIGIN}/checkout/paymob-response

6) Resend
   - Verify domain ${DOMAIN}
   - RESEND_FROM_EMAIL on verified mailbox

7) Cron (every 5 minutes) — notification queue without Redis
   - URL: POST ${ORIGIN}/api/cron/notification-jobs?limit=20
   - Header: x-internal-secret: <same as INTERNAL_API_SECRET>
   ${internalSet ? "   - INTERNAL_API_SECRET is set locally ✓" : "   - Generate INTERNAL_API_SECRET (hostinger:env-audit prints one-time values to console)"}

8) On-demand revalidate (Sanity / admin)
   - POST ${ORIGIN}/api/revalidate
   - Header: x-revalidate-secret: <REVALIDATE_SECRET>

9) After import + Redeploy
   - Probe: ${ORIGIN}/ (expect HTTP 200)
   - Admin → Settings → Health (integrations + database)

10) Manual / dashboard only
   - Paymob integration IDs & HMAC from Paymob dashboard
   - Meta WhatsApp templates (WHATSAPP_* env optional)
   - GEMINI_API_KEY, Sanity CMS (optional)
`);

if (missing.length) process.exit(1);
