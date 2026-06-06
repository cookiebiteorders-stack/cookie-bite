#!/usr/bin/env node
/**
 * Replace Next.js nomodule polyfill chunk with a no-op for modern-only targets.
 * Modern browsers skip nomodule scripts; this shrinks deploy size and Lighthouse legacy-JS noise.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, ".next", "build-manifest.json");

if (!fs.existsSync(manifestPath)) {
  console.warn("[stub-legacy-polyfills] Skip — .next/build-manifest.json missing");
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const files = Array.isArray(manifest.polyfillFiles) ? manifest.polyfillFiles : [];

if (files.length === 0) {
  console.log("[stub-legacy-polyfills] No polyfillFiles in build manifest");
  process.exit(0);
}

const stub = '/* modern browsers only — nomodule polyfills omitted */\n';
let totalBefore = 0;

for (const rel of files) {
  const target = path.join(root, ".next", rel.replace(/^\//, ""));
  if (!fs.existsSync(target)) continue;
  totalBefore += fs.statSync(target).size;
  fs.writeFileSync(target, stub, "utf8");
}

const kb = Math.round(totalBefore / 1024);
console.log(`[stub-legacy-polyfills] Stubbed ${files.length} nomodule polyfill file(s) (~${kb} KiB saved per legacy client)`);
