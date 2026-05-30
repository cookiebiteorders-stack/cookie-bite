#!/usr/bin/env node
/**
 * Smoke-test: standalone server serves HTML + linked /_next/static CSS (200).
 * Catches Hostinger deploys where HTML references hashed CSS that 404s.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverJs = path.join(root, ".next", "standalone", "server.js");
const PORT = Number(process.env.VERIFY_CSS_PORT) || 3199;
const BASE = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(serverJs)) {
  console.warn("[verify-standalone-css-serving] Skip — no standalone build");
  process.exit(0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(BASE, { redirect: "follow" });
      if (res.ok) return;
    } catch {
      // not ready
    }
    await sleep(400);
  }
  throw new Error(`Standalone server did not respond on ${BASE} within ${maxMs}ms`);
}

function extractStylesheetHrefs(html) {
  const hrefs = [];
  const re = /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    hrefs.push(match[1]);
  }
  return [...new Set(hrefs)];
}

const child = spawn(process.execPath, [serverJs], {
  cwd: path.dirname(serverJs),
  env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});

let failed = false;

try {
  await waitForServer();

  const homeRes = await fetch(BASE, {
    headers: { Accept: "text/html", "User-Agent": "cookie-bite-verify-css/1.0" },
  });
  if (!homeRes.ok) {
    throw new Error(`GET / returned ${homeRes.status}`);
  }
  const html = await homeRes.text();
  const hrefs = extractStylesheetHrefs(html).filter((h) => h.includes("/_next/static/"));

  if (hrefs.length === 0) {
    throw new Error("Homepage HTML has no /_next/static/ stylesheet links");
  }

  for (const href of hrefs) {
    const url = href.startsWith("http") ? href : `${BASE}${href}`;
    const cssRes = await fetch(url, { method: "HEAD" });
    if (!cssRes.ok) {
      throw new Error(`Stylesheet ${href} returned ${cssRes.status}`);
    }
  }

  const versionRes = await fetch(`${BASE}/build-version.txt`, { cache: "no-store" });
  if (!versionRes.ok) {
    throw new Error(`build-version.txt returned ${versionRes.status} (required for PWA CSS recovery)`);
  }

  console.log(
    `[verify-standalone-css-serving] OK — ${hrefs.length} stylesheet(s) + build-version.txt served.`,
  );
} catch (err) {
  failed = true;
  console.error("[verify-standalone-css-serving]", err.message || err);
} finally {
  child.kill("SIGTERM");
  await sleep(300);
  if (!child.killed) child.kill("SIGKILL");
}

process.exit(failed ? 1 : 0);
