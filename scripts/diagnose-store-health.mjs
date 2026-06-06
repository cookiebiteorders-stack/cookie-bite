#!/usr/bin/env node
/**
 * Diagnose why admin "Store Health" may show degraded.
 * Usage: npm run health:diagnose
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();
process.env.NODE_ENV = "production";

const audit = spawnSync("npm", ["run", "hostinger:env-audit"], {
  cwd: root,
  shell: true,
  encoding: "utf8",
});

console.log("\n=== تشخيص صحة المتجر (Cookie Bite) ===\n");

if (audit.status !== 0) {
  console.log("⚠️  متغيرات إنتاج ناقصة محلياً — هذا السبب الرئيسي لـ «صحة المتجر: متدهور»");
  const missing = audit.stdout?.match(/Missing or empty locally[\s\S]*?(?=Paymob|$)/);
  if (missing) console.log(missing[0].trim());
} else {
  console.log("✓ جميع المتغيرات الإلزامية موجودة محلياً");
}

const cronOk = Boolean(process.env.INTERNAL_API_SECRET?.trim());
console.log(cronOk ? "✓ INTERNAL_API_SECRET — جاهز لـ cron" : "✗ INTERNAL_API_SECRET ناقص — الإرسال التلقائي لن يعمل");

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
if (appUrl && !appUrl.includes("cookie-bite.com")) {
  console.log(`⚠️  NEXT_PUBLIC_APP_URL (${appUrl}) لا يطابق cookie-bite.com`);
}

console.log("\nخطوات الإصلاح:");
console.log("1) املأ PAYMOB_* في .env من لوحة accept.paymob.com");
console.log("2) npm run hostinger:env-audit ثم استورد hostinger-production.env في Hostinger → Redeploy");
console.log("3) npm run supabase:ensure-schema إن ظهرت جداول ناقصة في الإعدادات");
console.log("4) Hostinger cron كل 5 دقائق:");
console.log("   POST https://cookie-bite.com/api/cron/notification-jobs?limit=20");
console.log("   POST https://cookie-bite.com/api/cron/email-worker");
console.log("   Header: x-internal-secret: <INTERNAL_API_SECRET>");
console.log("5) Admin → Settings → Health — أعد التحديث بعد Redeploy\n");
