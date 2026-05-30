import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Hostinger may set cwd to repo root or `.next/standalone` after deploy. */
function resolveStandaloneServer() {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "server.js"),
    path.join(cwd, ".next", "standalone", "server.js"),
    path.join(__dirname, "server.js"),
    path.join(__dirname, ".next", "standalone", "server.js"),
  ];
  for (const entry of candidates) {
    if (fs.existsSync(entry)) return entry;
  }
  return null;
}

function warnMissingStandaloneAssets(standaloneDir) {
  const publicDir = path.join(standaloneDir, "public");
  const staticDir = path.join(standaloneDir, ".next", "static");
  const missing = [];
  if (!fs.existsSync(publicDir)) missing.push("public/");
  if (!fs.existsSync(staticDir)) missing.push(".next/static/");
  if (missing.length === 0) return;
  const message =
    `[cookie-bite] Standalone asset folders missing (${missing.join(", ")}). ` +
    "Run `npm run build` (postbuild copies assets) or CSS/static 404 → unstyled site on Hostinger.";
  if (process.env.NODE_ENV === "production") {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}

function warnProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;
  const required = [
    "NEXT_PUBLIC_APP_URL",
    "APP_BASE_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SIGNING_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
    "PAYMOB_API_KEY",
    "PAYMOB_INTEGRATION_ID_CARD",
    "PAYMOB_INTEGRATION_ID_WALLET",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "INTERNAL_API_SECRET",
    "REVALIDATE_SECRET",
  ];
  const missing = required.filter((k) => {
    const v = process.env[k];
    return !v || !String(v).trim() || String(v).includes("REPLACE_ME");
  });
  const hmac =
    process.env.PAYMOB_HMAC_SECRET?.trim() || process.env.PAYMOB_HMAC?.trim();
  if (!hmac) missing.push("PAYMOB_HMAC_SECRET");
  if (missing.length === 0) return;

  const message = `Cookie Bite production env missing: ${missing.join(", ")}`;
  if (process.env.COOKIE_BITE_FAIL_ON_MISSING_ENV === "true") {
    console.error(message);
    console.error(
      "Set variables in hPanel → Environment variables, then Redeploy. " +
        "Or run `npm run hostinger:env-audit` locally to generate hostinger-production.env.",
    );
    process.exit(1);
  }
  console.error(`${message} (boot continues — set COOKIE_BITE_FAIL_ON_MISSING_ENV=true to hard-fail)`);
}

const standaloneEntry = resolveStandaloneServer();

if (!standaloneEntry) {
  console.error(
    "Cookie Bite: Next.js standalone server not found.\n" +
      `  cwd: ${process.cwd()}\n` +
      "  Expected one of:\n" +
      "    - server.js (Hostinger outputDirectory)\n" +
      "    - .next/standalone/server.js (after npm run build)\n" +
      "  Fix: run `npm run build` on Hostinger or in CI before start; confirm buildCommand is `npm run build`.",
  );
  process.exit(1);
}

warnMissingStandaloneAssets(path.dirname(standaloneEntry));
warnProductionEnv();

const port = Number(process.env.PORT) || 3000;
if (!process.env.PORT) process.env.PORT = String(port);

console.info(
  `[cookie-bite] Starting standalone (${path.relative(process.cwd(), standaloneEntry) || standaloneEntry}) on port ${port}`,
);

await import(pathToFileURL(standaloneEntry).href);
