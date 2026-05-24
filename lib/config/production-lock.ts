/**
 * Cookie Bite — Production Lock
 *
 * Validates required env vars at boot/serverless cold start and exposes the
 * canonical production host so middleware/proxy can enforce HTTPS + host.
 *
 * In production we throw if anything critical is missing; in development we
 * only warn so local DX is not blocked.
 */

const PRIMARY_DOMAIN =
  process.env.COOKIE_BITE_PRIMARY_DOMAIN ?? "cookie-bite.com";

export const PRODUCTION_HOST = PRIMARY_DOMAIN.replace(/^https?:\/\//, "")
  .replace(/\/+$/, "")
  .toLowerCase();

export const PRODUCTION_ORIGIN = `https://${PRODUCTION_HOST}`;

function isPlaceholderEnv(value: string | undefined): boolean {
  const v = value?.trim() ?? "";
  return !v || v.includes("REPLACE_ME") || v.startsWith("__SET_IN_");
}

/** Paymob HMAC: webhook + intention use PAYMOB_HMAC_SECRET; PAYMOB_HMAC is legacy alias. */
export function hasPaymobHmacSecret(): boolean {
  return (
    !isPlaceholderEnv(process.env.PAYMOB_HMAC_SECRET) ||
    !isPlaceholderEnv(process.env.PAYMOB_HMAC)
  );
}

const REQUIRED_PROD_KEYS = [
  // App
  "NEXT_PUBLIC_APP_URL",
  "APP_BASE_URL",
  // Clerk
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_WEBHOOK_SIGNING_SECRET",
  // Supabase
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
  // Paymob
  "PAYMOB_API_KEY",
  "PAYMOB_INTEGRATION_ID_CARD",
  "PAYMOB_INTEGRATION_ID_WALLET",
  // Resend
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  // Internal + ISR
  "INTERNAL_API_SECRET",
  "REVALIDATE_SECRET",
] as const;

/** مجموعات متغيرات الإنتاج لكل تكامل — تُستخدم في لوحة الصحة وليست قياسات ping. */
export const INTEGRATION_ENV_GROUPS = {
  app_urls: ["NEXT_PUBLIC_APP_URL", "APP_BASE_URL"],
  clerk: [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_WEBHOOK_SIGNING_SECRET",
  ],
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"],
  /** مرجع لواجهة الإعدادات؛ الجاهزية الفعلية لـ Paymob تستخدم hasPaymobHmacSecret() أيضاً */
  paymob: [
    "PAYMOB_API_KEY",
    "PAYMOB_INTEGRATION_ID_CARD",
    "PAYMOB_INTEGRATION_ID_WALLET",
    "PAYMOB_HMAC_SECRET",
  ],
  resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  internal_api: ["INTERNAL_API_SECRET", "REVALIDATE_SECRET"],
} as const;

export type IntegrationEnvStatus = {
  [K in keyof typeof INTEGRATION_ENV_GROUPS]: boolean;
} & {
  /** غير إلزامي للإقلاع — يُبلّغ في التحذيرات عند الغياب */
  ai_gemini: boolean;
  /** Sanity CMS — اختياري */
  cms_sanity: boolean;
  /** Meta Cloud API — اختياري */
  whatsapp: boolean;
  /** BullMQ — اختياري؛ بدونه يُستخدم طابور DB + cron */
  redis_queue: boolean;
};

export type ProductionEnvCheck = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

function integrationGroupReady(missingKeys: ReadonlySet<string>, keys: readonly string[]): boolean {
  return !keys.some((k) => missingKeys.has(k));
}

export function getIntegrationEnvStatus(check: ProductionEnvCheck): IntegrationEnvStatus {
  if (process.env.NODE_ENV !== "production") {
    return {
      app_urls: true,
      clerk: true,
      supabase: true,
      paymob: true,
      resend: true,
      internal_api: true,
      ai_gemini: true,
      cms_sanity: true,
      whatsapp: true,
      redis_queue: true,
    };
  }
  const m = new Set(check.missing);
  const paymobReady =
    integrationGroupReady(m, [
      "PAYMOB_API_KEY",
      "PAYMOB_INTEGRATION_ID_CARD",
      "PAYMOB_INTEGRATION_ID_WALLET",
    ]) && hasPaymobHmacSecret();

  return {
    app_urls: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.app_urls),
    clerk: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.clerk),
    supabase: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.supabase),
    paymob: paymobReady,
    resend: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.resend),
    internal_api: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.internal_api),
    ai_gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    cms_sanity: Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim()),
    whatsapp: Boolean(
      process.env.WHATSAPP_CLOUD_API_TOKEN?.trim() &&
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    ),
    redis_queue: Boolean(process.env.REDIS_URL?.trim()),
  };
}

export function checkProductionEnv(): ProductionEnvCheck {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (process.env.NODE_ENV !== "production") {
    return { ok: true, missing, warnings: ["non-production environment"] };
  }

  for (const key of REQUIRED_PROD_KEYS) {
    if (isPlaceholderEnv(process.env[key])) {
      missing.push(key);
    }
  }

  if (!hasPaymobHmacSecret()) {
    missing.push("PAYMOB_HMAC_SECRET");
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    warnings.push(
      "GEMINI_API_KEY missing — Mrs. Cookie, Mr. Brownie, and product assistant AI are disabled",
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() ||
    !process.env.NEXT_PUBLIC_SANITY_DATASET?.trim()
  ) {
    warnings.push(
      "Sanity CMS env incomplete — blog/content previews may be empty (NEXT_PUBLIC_SANITY_PROJECT_ID / DATASET)",
    );
  }

  // sanity: NEXT_PUBLIC_APP_URL يجب أن يطابق الدومين الأساسي
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").toLowerCase();
  if (appUrl && !appUrl.includes(PRODUCTION_HOST)) {
    warnings.push(
      `NEXT_PUBLIC_APP_URL (${appUrl}) does not match canonical host ${PRODUCTION_HOST}`,
    );
  }

  return { ok: missing.length === 0, missing, warnings };
}

export function assertProductionEnvOrWarn(): void {
  if (process.env.NODE_ENV !== "production") return;
  const result = checkProductionEnv();
  if (!result.ok) {
    const message = `Cookie Bite production env missing: ${result.missing.join(", ")}`;
    if (process.env.COOKIE_BITE_FAIL_ON_MISSING_ENV === "true") {
      throw new Error(message);
    }
    console.error(message);
  }
  for (const w of result.warnings) {
    console.warn(`Cookie Bite env warning: ${w}`);
  }
}
