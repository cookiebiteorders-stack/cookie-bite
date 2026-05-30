#!/usr/bin/env node
/**
 * Fail the build if standalone output is missing static assets (root cause of unstyled site on Hostinger).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(root, ".next", "standalone");
const required = [
  path.join(standaloneDir, "server.js"),
  path.join(standaloneDir, "public"),
  path.join(standaloneDir, ".next", "static"),
];

const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error("[verify-standalone-assets] Missing required deploy paths:");
  for (const p of missing) console.error("  -", path.relative(root, p));
  console.error("Run `npm run build` — postbuild must copy public/ and .next/static into standalone.");
  process.exit(1);
}

function collectCssFiles(staticRoot) {
  const files = [];
  for (const sub of ["css", "chunks"]) {
    const dir = path.join(staticRoot, sub);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".css")) files.push(path.join(sub, name));
    }
  }
  return files;
}

const staticRoot = path.join(standaloneDir, ".next", "static");
const cssFiles = collectCssFiles(staticRoot);

if (cssFiles.length === 0) {
  console.error(
    "[verify-standalone-assets] No CSS in .next/standalone/.next/static/{css,chunks}/",
  );
  process.exit(1);
}

const buildVersionStandalone = path.join(standaloneDir, "public", "build-version.txt");
const buildVersionRoot = path.join(root, "public", "build-version.txt");
if (!fs.existsSync(buildVersionStandalone) || !fs.existsSync(buildVersionRoot)) {
  console.error("[verify-standalone-assets] Missing public/build-version.txt (PWA CSS recovery needs it).");
  process.exit(1);
}

console.log(
  `[verify-standalone-assets] OK — standalone has public/, static/, ${cssFiles.length} CSS file(s), build-version.txt.`,
);
