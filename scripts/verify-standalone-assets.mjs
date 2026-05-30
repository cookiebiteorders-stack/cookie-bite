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

const staticCssDir = path.join(standaloneDir, ".next", "static", "css");
const cssFiles = fs.existsSync(staticCssDir)
  ? fs.readdirSync(staticCssDir).filter((f) => f.endsWith(".css"))
  : [];

if (cssFiles.length === 0) {
  console.error("[verify-standalone-assets] No CSS files in .next/standalone/.next/static/css");
  process.exit(1);
}

console.log(
  `[verify-standalone-assets] OK — standalone has public/, static/, and ${cssFiles.length} CSS file(s).`,
);
