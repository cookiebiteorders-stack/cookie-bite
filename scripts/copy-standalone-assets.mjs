#!/usr/bin/env node
/**
 * Next.js standalone output does not include `public/` or `.next/static` by default.
 * Hostinger (and other Node hosts) need these beside server.js.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const serverJs = path.join(standaloneDir, "server.js");

if (!fs.existsSync(serverJs)) {
  console.warn("[copy-standalone-assets] Skip — run after `next build` (.next/standalone/server.js missing)");
  process.exit(0);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");

const copied = [];
if (copyDir(publicSrc, publicDest)) copied.push("public/");
if (copyDir(staticSrc, staticDest)) copied.push(".next/static/");

if (copied.length) {
  console.log(`[copy-standalone-assets] Copied into .next/standalone: ${copied.join(", ")}`);
} else {
  console.warn("[copy-standalone-assets] Nothing copied — check build output");
}
