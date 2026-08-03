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
const serverSrc = path.join(root, ".next", "server");
const serverDest = path.join(standaloneDir, ".next", "server");

if (!copyDir(staticSrc, staticDest)) {
  console.error("[copy-standalone-assets] Failed — .next/static missing after build");
  process.exit(1);
}
if (!copyDir(publicSrc, publicDest)) {
  console.error("[copy-standalone-assets] Failed — public/ missing");
  process.exit(1);
}
if (!copyDir(serverSrc, serverDest)) {
  console.error("[copy-standalone-assets] Failed — .next/server missing after build");
  process.exit(1);
}

const buildIdPath = path.join(root, ".next", "BUILD_ID");
let buildVersion = String(Date.now());
if (fs.existsSync(buildIdPath)) {
  buildVersion = fs.readFileSync(buildIdPath, "utf8").trim() || buildVersion;
}

for (const destRoot of [path.join(root, "public"), publicDest]) {
  if (!fs.existsSync(destRoot)) fs.mkdirSync(destRoot, { recursive: true });
  fs.writeFileSync(path.join(destRoot, "build-version.txt"), `${buildVersion}\n`, "utf8");
}

const serverMjs = path.join(root, "server.mjs");
const serverDest = path.join(standaloneDir, "server.mjs");
const loopbackSrc = path.join(root, "scripts", "background-workers-loopback.mjs");
const loopbackDestDir = path.join(standaloneDir, "scripts");
const loopbackDest = path.join(loopbackDestDir, "background-workers-loopback.mjs");

if (fs.existsSync(serverMjs)) {
  fs.copyFileSync(serverMjs, serverDest);
}
if (fs.existsSync(loopbackSrc)) {
  fs.mkdirSync(loopbackDestDir, { recursive: true });
  fs.copyFileSync(loopbackSrc, loopbackDest);
}

console.log(`[copy-standalone-assets] Copied into .next/standalone: public/, .next/static/`);
if (fs.existsSync(serverDest)) {
  console.log("[copy-standalone-assets] Also copied server.mjs + background-workers-loopback.mjs");
}
console.log(`[copy-standalone-assets] build-version.txt → ${buildVersion}`);
