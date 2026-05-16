#!/usr/bin/env node
/**
 * Mrs. Cookie / Gemini diagnostics — verifies API key + a minimal model ping.
 * Usage: npm run copilot:check
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

if (!key) {
  fail("GEMINI_API_KEY missing — add to .env or .env.local (https://aistudio.google.com/apikey)");
  process.exit(1);
}
ok(`GEMINI_API_KEY present (${key.length} chars)`);
ok(`Model: ${model}`);

const { GoogleGenerativeAI } = await import("@google/generative-ai");
const genAI = new GoogleGenerativeAI(key);
const gemini = genAI.getGenerativeModel({ model });

try {
  const result = await gemini.generateContent({
    contents: [{ role: "user", parts: [{ text: 'Reply with exactly: "Mrs. Cookie online"' }] }],
    generationConfig: { maxOutputTokens: 32, temperature: 0 },
  });
  const text = result.response.text()?.trim() || "";
  if (text.toLowerCase().includes("mrs") || text.toLowerCase().includes("cookie")) {
    ok(`Gemini ping OK — ${text.slice(0, 80)}`);
  } else {
    ok(`Gemini responded: ${text.slice(0, 120) || "(empty)"}`);
  }
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
  process.exit(1);
}

ok("Mrs. Cookie copilot backend is ready (/api/admin/copilot/chat)");
