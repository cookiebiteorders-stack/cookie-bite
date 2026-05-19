#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cookie Bite — Secret rotation checklist.
 *
 * يطبع خطة عملية لتدوير كل المفاتيح التي قد تكون كُشفت لأطراف ثالثة (ومنها
 * مساعدات الذكاء الاصطناعي). الهدف أن لا تترك أي مفتاح حيّ بعد جلسة عمل.
 *
 * Usage:
 *   node scripts/rotate-secrets-checklist.mjs
 *   node scripts/rotate-secrets-checklist.mjs --json
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const txt = fs.readFileSync(file, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    const idx = raw.indexOf("=");
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    let value = raw.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const SECRETS = [
  {
    key: "SUPABASE_SERVICE_KEY",
    severity: "CRITICAL",
    rotate_at: "https://supabase.com/dashboard/project/_/settings/api",
    notes: "Reset service_role JWT. سيبطل المفتاح القديم فوراً.",
  },
  {
    key: "CLERK_SECRET_KEY",
    severity: "CRITICAL",
    rotate_at: "https://dashboard.clerk.com/last-active/api-keys",
    notes: "أنشئ secret key جديداً ثم احذف القديم بعد النشر.",
  },
  {
    key: "CLERK_WEBHOOK_SIGNING_SECRET",
    severity: "HIGH",
    rotate_at: "Clerk Dashboard → Webhooks → endpoint → Reveal signing secret",
    notes: "ضع القيمة في hPanel env قبل النشر.",
  },
  {
    key: "RESEND_API_KEY",
    severity: "HIGH",
    rotate_at: "https://resend.com/api-keys",
    notes: "أنشئ مفتاحاً جديداً Limited (Sending Access) فقط، واحذف القديم.",
  },
  {
    key: "GEMINI_API_KEY",
    severity: "HIGH",
    rotate_at: "https://aistudio.google.com/app/apikey",
    notes: "Regenerate. غيّر المفتاح في كلا المتغيرين GEMINI_API_KEY و GOOGLE_GEMINI_API_KEY.",
  },
  {
    key: "GOOGLE_GEMINI_API_KEY",
    severity: "HIGH",
    rotate_at: "https://aistudio.google.com/app/apikey",
    notes: "نفس المفتاح أعلاه — احتفظ بنفس الـ rotation.",
  },
  {
    key: "GOOGLE_CLOUD_API_KEY",
    severity: "HIGH",
    rotate_at: "https://console.cloud.google.com/apis/credentials",
    notes: "Restrict by HTTP referrer + IP وبـ APIs المسموحة فقط.",
  },
  {
    key: "GOOGLE_CLOUD_CLIENT_SECRET",
    severity: "HIGH",
    rotate_at: "https://console.cloud.google.com/apis/credentials",
    notes: "OAuth Client → Reset secret.",
  },
  {
    key: "SANITY_API_TOKEN",
    severity: "HIGH",
    rotate_at: "https://www.sanity.io/manage → Project → API → Tokens",
    notes: "احذف التوكن الحالي وأنشئ Editor token جديداً.",
  },
  {
    key: "SANITY_WEBHOOK_SECRET",
    severity: "MEDIUM",
    rotate_at: "Sanity → Project → API → Webhooks",
    notes: "Regenerate signing secret لكل webhook.",
  },
  {
    key: "CLOUDINARY_API_SECRET",
    severity: "HIGH",
    rotate_at: "https://console.cloudinary.com/settings/api-keys",
    notes: "Invalidate the current api_secret.",
  },
  {
    key: "OPENAI_API_KEY",
    severity: "HIGH",
    rotate_at: "https://platform.openai.com/api-keys",
    notes: "Revoke الحالي وأنشئ secret جديداً (project-scoped).",
  },
  {
    key: "GITHUB_PERSONAL_ACCESS_TOKEN",
    severity: "HIGH",
    rotate_at: "https://github.com/settings/tokens",
    notes: "Revoke الـ classic token الحالي وأنشئ fine-grained مع الحد الأدنى.",
  },
  {
    key: "HOSTINGER_API_TOKEN",
    severity: "HIGH",
    rotate_at: "hPanel → Account → API",
    notes: "Revoke ثم أنشئ token جديداً، بدّل المفاتيح في CI أيضاً.",
  },
  {
    key: "PAYMOB_API_KEY",
    severity: "CRITICAL",
    rotate_at: "Paymob Dashboard → Settings → API Keys",
    notes: "إن كان مكشوفاً للعموم، تواصل مع دعم Paymob لإصدار مفتاح جديد.",
  },
  {
    key: "PAYMOB_HMAC_SECRET",
    severity: "CRITICAL",
    rotate_at: "Paymob Dashboard → Settings → Account info → HMAC",
    notes: "Reset, ثم حدّث المفتاح في hPanel وفي Paymob webhooks.",
  },
  {
    key: "VAPID_PRIVATE_KEY",
    severity: "MEDIUM",
    rotate_at: "Generate new pair: `npx web-push generate-vapid-keys`",
    notes: "اطلب من المتصفحات الاشتراك من جديد.",
  },
  {
    key: "REVALIDATE_SECRET",
    severity: "MEDIUM",
    rotate_at: "Generate locally: `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`",
    notes: "حدّث القيمة في hPanel وفي أي CDN/Cron يستدعي /api/revalidate.",
  },
  {
    key: "INTERNAL_API_SECRET",
    severity: "MEDIUM",
    rotate_at: "Generate locally: `node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"`",
    notes: "بعد التحديث، أعد نشر أي خدمة تستدعي /api/push/send داخلياً.",
  },
  {
    key: "OWNER_BOOTSTRAP_PASSWORD",
    severity: "CRITICAL",
    rotate_at: "Clerk Dashboard → Users → primary owner → Reset password",
    notes:
      "تخلَّ عن استخدام كلمة مرور ثابتة في .env — الاعتماد فقط على Clerk + 2FA.",
  },
];

const present = SECRETS.map((s) => ({
  ...s,
  present: !!process.env[s.key]?.trim(),
}));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(present, null, 2));
  process.exit(0);
}

const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
present.sort((a, b) => order[a.severity] - order[b.severity]);

console.log("\n================ Cookie Bite — Secret rotation plan ================\n");
console.log("للأمان الكامل، نفّذ كل عنصر بالتتابع. القيم الموجودة في .env يجب أن");
console.log("تُعتبر مكشوفة (تم تداولها مع مساعدات IDE/AI) وتجب إعادة توليدها.\n");

for (const s of present) {
  console.log(`  [${s.severity}] ${s.key} ${s.present ? "" : "(missing)"}`);
  console.log(`    rotate at : ${s.rotate_at}`);
  console.log(`    notes     : ${s.notes}\n`);
}

console.log("بعد تدوير كل مفتاح:");
console.log("  1) ضع القيم الجديدة في `.env` المحلي + Hostinger hPanel + CI.");
console.log("  2) أعد بناء التطبيق ونشره (npm run build && deploy).");
console.log("  3) شغّل `node scripts/security-audit.mjs` للتحقق.");
console.log("  4) شغّل `node scripts/supabase-backup.mjs` لإنشاء نسخة احتياطية فورية.");
