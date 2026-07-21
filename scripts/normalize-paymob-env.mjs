#!/usr/bin/env node

/**
 * Copy Paymob values from legacy/alternate .env names into the canonical
 * server-side variables expected by lib/paymob/*.
 *
 * Does not print secret values. Safe to run multiple times.
 */

import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    map.set(key, value);
  }
  return map;
}

function upsertLine(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  return `${content.trimEnd()}\n${line}\n`;
}

const aliases = [
  ["PAYMOB_SECRET_KEY", ["PAYMOB_SECRET_KEY", "NEXT_PUBLIC_PAYMOB_SECRET_KEY"]],
  ["PAYMOB_API_KEY", ["PAYMOB_API_KEY", "NEXT_PUBLIC_PAYMOB_API_KEY"]],
  ["PAYMOB_PUBLIC_KEY", ["PAYMOB_PUBLIC_KEY", "NEXT_PUBLIC_PAYMOB_PUBLIC_KEY"]],
  ["PAYMOB_HMAC_SECRET", ["PAYMOB_HMAC_SECRET", "NEXT_PUBLIC_PAYMOB_HMAC_SECRET", "PAYMOB_HMAC"]],
  ["PAYMOB_INTEGRATION_ID_CARD", ["PAYMOB_INTEGRATION_ID_CARD", "PAYMOB_CARD_INTEGRATION_ID"]],
  ["PAYMOB_INTEGRATION_ID_WALLET", ["PAYMOB_INTEGRATION_ID_WALLET", "PAYMOB_WALLET_INTEGRATION_ID"]],
];

if (!fs.existsSync(envPath)) {
  console.error("❌ .env not found");
  process.exit(1);
}

let content = fs.readFileSync(envPath, "utf-8");
const env = parseEnv(content);
let changed = 0;

for (const [canonical, sources] of aliases) {
  const existing = env.get(canonical);
  if (existing && existing.length > 0 && !existing.startsWith("<")) {
    continue;
  }
  const sourceValue = sources.map((k) => env.get(k)).find((v) => v && v.length > 0);
  if (!sourceValue) continue;
  content = upsertLine(content, canonical, sourceValue);
  changed += 1;
  console.log(`✅ Set ${canonical} from legacy env alias`);
}

if (changed === 0) {
  console.log("✅ Paymob canonical env vars already present — no changes");
} else {
  fs.writeFileSync(envPath, content);
  console.log(`\n✅ Updated ${changed} Paymob variable(s). Restart dev server if running.`);
  console.log("Tip: remove NEXT_PUBLIC_PAYMOB_* secrets from .env — they belong server-side only.");
}
