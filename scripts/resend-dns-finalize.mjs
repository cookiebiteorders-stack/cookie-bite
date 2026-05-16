#!/usr/bin/env node
/**
 * scripts/resend-dns-finalize.mjs
 *
 * Adds the Resend-specific DNS records to the Hostinger zone for
 * cookie-bite.com so the domain can be verified in Resend and the
 * site can send transactional email from `@cookie-bite.com`.
 *
 * Usage:
 *
 *   1. Go to https://resend.com/domains and click "Add Domain" → cookie-bite.com.
 *      Resend will display 3 records: SPF, DKIM (TXT, name "resend._domainkey"),
 *      and an MX record for bounce handling.
 *
 *   2. Copy the long DKIM value (the string starting with "p=...").
 *
 *   3. Run:
 *
 *        node scripts/resend-dns-finalize.mjs "<paste DKIM value here>"
 *
 *      The script will:
 *        - PUT a new TXT record at  resend._domainkey  with your DKIM value.
 *        - PUT an MX record at      send                pointing to Resend's
 *          bounce handler (priority 10).
 *
 *      SPF already includes _spf.resend.com (added programmatically) and
 *      DMARC was set to p=quarantine + rua reporting in a previous step.
 *
 *   4. Back in the Resend dashboard, click "Verify DNS records". It should
 *      flip to "Verified" within a few minutes.
 *
 * Env vars consumed:
 *   - HOSTINGER_API_TOKEN  (required) — from your Hostinger API panel
 *   - RESEND_DOMAIN        (optional, defaults to cookie-bite.com)
 *   - RESEND_REGION_HOST   (optional, defaults to feedback-smtp.eu-west-1.amazonses.com)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// ─── tiny .env loader (no dependency) ──────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
try {
  const envPath = resolve(__dirname, "..", ".env");
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
} catch {
  // .env may not exist — that's fine if env is set elsewhere
}

// ─── args & config ─────────────────────────────────────────────────────────
const dkimValue = process.argv[2];
if (!dkimValue) {
  console.error("Usage: node scripts/resend-dns-finalize.mjs \"<paste DKIM value from Resend>\"\n");
  console.error("Tip: get it from https://resend.com/domains → cookie-bite.com → DKIM row.");
  process.exit(1);
}

const HOSTINGER_TOKEN = process.env.HOSTINGER_API_TOKEN;
if (!HOSTINGER_TOKEN) {
  console.error("Missing HOSTINGER_API_TOKEN in .env");
  process.exit(1);
}

const DOMAIN = process.env.RESEND_DOMAIN || "cookie-bite.com";
const BOUNCE_HOST = process.env.RESEND_REGION_HOST || "feedback-smtp.eu-west-1.amazonses.com";

// ─── call Hostinger DNS API ────────────────────────────────────────────────
async function updateZone() {
  const body = {
    overwrite: true,
    zone: [
      {
        name: "resend._domainkey",
        type: "TXT",
        ttl: 3600,
        records: [{ content: dkimValue }],
      },
      {
        name: "send",
        type: "MX",
        ttl: 3600,
        records: [{ content: `10 ${BOUNCE_HOST}.` }],
      },
    ],
  };

  const url = `https://developers.hostinger.com/api/dns/v1/zones/${encodeURIComponent(DOMAIN)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${HOSTINGER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Hostinger API ${res.status}:`, text);
    process.exit(2);
  }
  console.log(`Hostinger DNS updated for ${DOMAIN}.`);
  console.log("Response:", text);
}

await updateZone();

console.log("\nNext steps:");
console.log(`  1. Wait 1–5 minutes for DNS propagation.`);
console.log(`  2. Open https://resend.com/domains/${DOMAIN} and click "Verify DNS records".`);
console.log(`  3. Once verified, run a real send via /admin/template-library "Send test".`);
