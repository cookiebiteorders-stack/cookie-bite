#!/usr/bin/env node
/**
 * يضيف INTERNAL_API_SECRET و REVALIDATE_SECRET إلى .env (ثم .env.local) إن لم يكونا موجودين.
 * Usage: npm run env:ensure-secrets
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const KEYS = ["INTERNAL_API_SECRET", "REVALIDATE_SECRET"];
const TARGETS = [".env", ".env.local"];

function loadExisting(file) {
  const p = resolve(root, file);
  if (!existsSync(p)) return { path: p, content: "", exists: false };
  return { path: p, content: readFileSync(p, "utf8"), exists: true };
}

function hasKey(content, key) {
  return new RegExp(`^${key}=`, "m").test(content);
}

let changed = false;

for (const file of TARGETS) {
  const { path, content, exists } = loadExisting(file);
  if (!exists && file === ".env.local") continue;

  let next = content;
  const added = [];

  for (const key of KEYS) {
    if (hasKey(next, key)) continue;
    const secret = randomBytes(32).toString("hex");
    next += (next.endsWith("\n") || next === "" ? "" : "\n") + `${key}=${secret}\n`;
    added.push(key);
  }

  if (added.length === 0) {
    console.log(`[${file}] OK —`, KEYS.join(", "), "already set");
    continue;
  }

  writeFileSync(path, next, "utf8");
  console.log(`[${file}] Appended:`, added.join(", "));
  changed = true;
}

if (!changed) {
  console.log("No changes needed.");
} else {
  console.log("Copy INTERNAL_API_SECRET to Hostinger hPanel if you deploy, then redeploy.");
}
