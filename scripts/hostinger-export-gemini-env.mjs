#!/usr/bin/env node
/**
 * Export GEMINI_* vars for Hostinger hPanel import (paste or .env upload).
 * Writes hostinger-gemini.env (gitignored) — never commit.
 *
 * Usage: npm run hostinger:export-gemini-env
 */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outPath = resolve(root, "hostinger-gemini.env");

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

loadEnvFile(".env");
loadEnvFile(".env.local");

const key = process.env.GEMINI_API_KEY?.trim();
const model =
  process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";

if (!key) {
  console.error("GEMINI_API_KEY missing in .env / .env.local");
  process.exit(1);
}

const body = [
  "# Paste into Hostinger → cookie-bite.com → Settings & Redeploy → Environment variables",
  "# Or use Import from .env file",
  `GEMINI_API_KEY=${key}`,
  `MR_BROWNIE_GEMINI_MODEL=${model}`,
  "",
].join("\n");

writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${outPath}`);
console.log("Next: hPanel → Websites → cookie-bite.com → Settings & Redeploy → import this file → Redeploy");
