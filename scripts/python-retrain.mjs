#!/usr/bin/env node
/**
 * Retrain recommendation models (calls local Python API).
 * Requires: npm run python:up + INTERNAL_API_SECRET in .env
 */
import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    const i = raw.indexOf("=");
    if (i === -1) continue;
    const k = raw.slice(0, i).trim();
    let v = raw.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const base = (process.env.PYTHON_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const secret = process.env.INTERNAL_API_SECRET;
if (!secret) {
  console.error("Missing INTERNAL_API_SECRET");
  process.exit(1);
}

const res = await fetch(`${base}/recommendations/retrain`, {
  method: "POST",
  headers: { "x-internal-secret": secret },
});
const text = await res.text();
console.log(res.status, text);
process.exit(res.ok ? 0 : 1);
