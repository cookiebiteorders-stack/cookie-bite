#!/usr/bin/env node
/**
 * يضيف INTERNAL_API_SECRET و REVALIDATE_SECRET إلى .env.local إن لم يكونا موجودين.
 * Usage: node scripts/append-missing-env-secrets.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

const KEYS = ["INTERNAL_API_SECRET", "REVALIDATE_SECRET"];

function loadExisting() {
  if (!existsSync(envPath)) return "";
  return readFileSync(envPath, "utf8");
}

function hasKey(content, key) {
  return new RegExp(`^${key}=`, "m").test(content);
}

let content = loadExisting();
const added = [];

for (const key of KEYS) {
  if (hasKey(content, key)) continue;
  const secret = randomBytes(32).toString("hex");
  content += (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${secret}\n`;
  added.push(key);
}

if (added.length === 0) {
  console.log("No changes —", KEYS.join(" and "), "already set in .env.local");
  process.exit(0);
}

writeFileSync(envPath, content, "utf8");
console.log("Appended to .env.local:", added.join(", "));
console.log("Copy the same values to Hostinger hPanel, then redeploy.");
