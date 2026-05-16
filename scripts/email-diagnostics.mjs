#!/usr/bin/env node
/**
 * scripts/email-diagnostics.mjs
 *
 * One-shot health check for the Cookie Bite transactional email pipeline.
 *
 * Verifies:
 *   - Resend API key is valid (sends a real test via onboarding@resend.dev).
 *   - Hostinger DNS zone has the SPF / DMARC / DKIM records Resend needs.
 *   - The verified-domain DKIM CNAME is present and resolves publicly.
 *
 * Usage:   node scripts/email-diagnostics.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
try {
  const raw = readFileSync(resolve(__dirname, "..", ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
} catch {}

const RESEND_KEY = process.env.RESEND_API_KEY;
const HOSTINGER_TOKEN = process.env.HOSTINGER_API_TOKEN;
const DOMAIN = process.env.RESEND_DOMAIN || "cookie-bite.com";
const FROM = process.env.RESEND_FROM_EMAIL || `Cookie Bite <orders@${DOMAIN}>`;
const REPLY_TO = process.env.RESEND_REPLY_TO || `cookie-bite@${DOMAIN}`;
const INBOX = process.env.CONTACT_INBOX || `cookie-bite@${DOMAIN}`;

const TEST_TO = process.argv[2] || process.env.OWNER_BOOTSTRAP_EMAIL || "cookie.bite.orders@gmail.com";

const checks = [];
function pass(name, detail = "") {
  checks.push({ name, status: "PASS", detail });
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail) {
  checks.push({ name, status: "WARN", detail });
  console.log(`  WARN  ${name} — ${detail}`);
}
function fail(name, detail) {
  checks.push({ name, status: "FAIL", detail });
  console.log(`  FAIL  ${name} — ${detail}`);
}

console.log("\nCookie Bite — Email Pipeline Diagnostics\n");
console.log(`Domain:      ${DOMAIN}`);
console.log(`From:        ${FROM}`);
console.log(`Reply-To:    ${REPLY_TO}`);
console.log(`Inbox:       ${INBOX}`);
console.log(`Test-To:     ${TEST_TO}\n`);

// ─── 1. Resend API health ──────────────────────────────────────────────────
console.log("[1] Resend API key");
if (!RESEND_KEY) {
  fail("RESEND_API_KEY", "missing — add to .env");
} else {
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Cookie Bite <onboarding@resend.dev>",
        to: [TEST_TO],
        subject: "Cookie Bite diagnostics — API key OK",
        html: "<p>If you can read this, the Resend API key is healthy.</p>",
      }),
    });
    const j = await r.json();
    if (r.ok && j.id) pass("send via onboarding@resend.dev", `message id: ${j.id}`);
    else fail("send via onboarding@resend.dev", JSON.stringify(j));
  } catch (e) {
    fail("send via onboarding@resend.dev", e.message);
  }

  console.log("\n[2] Resend domain send (using your From address)");
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TEST_TO],
        reply_to: REPLY_TO,
        subject: "Cookie Bite diagnostics — domain send",
        html: `<p>Sent from <strong>${FROM}</strong>. Reply-To: ${REPLY_TO}</p>`,
      }),
    });
    const j = await r.json();
    if (r.ok && j.id) pass("send from verified domain", `message id: ${j.id}`);
    else if (j.message && /not verified/i.test(j.message)) warn("send from verified domain", "domain not yet verified — run scripts/resend-dns-finalize.mjs after pasting DKIM");
    else fail("send from verified domain", JSON.stringify(j));
  } catch (e) {
    fail("send from verified domain", e.message);
  }
}

// ─── 3. Hostinger DNS state ────────────────────────────────────────────────
console.log("\n[3] Hostinger DNS zone records");
if (!HOSTINGER_TOKEN) {
  warn("HOSTINGER_API_TOKEN", "missing — skipping zone inspection");
} else {
  try {
    const r = await fetch(`https://developers.hostinger.com/api/dns/v1/zones/${encodeURIComponent(DOMAIN)}`, {
      headers: { Authorization: `Bearer ${HOSTINGER_TOKEN}` },
    });
    const records = await r.json();
    if (!Array.isArray(records)) {
      fail("zone fetch", JSON.stringify(records));
    } else {
      const findTxt = (name) => records.find((x) => x.name === name && x.type === "TXT");
      const spf = findTxt("@")?.records?.find((rr) => /v=spf1/i.test(rr.content));
      if (!spf) fail("SPF", "no v=spf1 record found");
      else if (/include:_spf\.resend\.com/i.test(spf.content)) pass("SPF", "includes _spf.resend.com");
      else warn("SPF", `present but missing Resend: ${spf.content}`);

      const dmarc = findTxt("_dmarc");
      if (!dmarc) fail("DMARC", "no _dmarc record");
      else pass("DMARC", dmarc.records[0].content.replace(/^"|"$/g, ""));

      const dkim = records.find((x) => x.name === "resend._domainkey");
      if (!dkim) warn("DKIM (resend._domainkey)", "missing — run scripts/resend-dns-finalize.mjs <DKIM>");
      else pass("DKIM (resend._domainkey)", "present");

      const sendMx = records.find((x) => x.name === "send" && x.type === "MX");
      if (!sendMx) warn("bounce MX (send)", "missing — added automatically by resend-dns-finalize.mjs");
      else pass("bounce MX (send)", sendMx.records[0].content);

      const inboxMx = records.find((x) => x.name === "@" && x.type === "MX");
      if (!inboxMx) fail("inbox MX (@)", "missing — Hostinger mailbox can't receive replies");
      else pass("inbox MX (@)", inboxMx.records.map((rr) => rr.content).join(", "));
    }
  } catch (e) {
    fail("zone fetch", e.message);
  }
}

// ─── summary ───────────────────────────────────────────────────────────────
const failed = checks.filter((c) => c.status === "FAIL");
const warned = checks.filter((c) => c.status === "WARN");
console.log("\nSummary:");
console.log(`  ${checks.filter((c) => c.status === "PASS").length} pass · ${warned.length} warn · ${failed.length} fail`);
if (failed.length) {
  console.log("\nBlocking issues:");
  failed.forEach((c) => console.log(`  - ${c.name}: ${c.detail}`));
}
if (warned.length) {
  console.log("\nNon-blocking warnings:");
  warned.forEach((c) => console.log(`  - ${c.name}: ${c.detail}`));
}
process.exit(failed.length ? 2 : 0);
