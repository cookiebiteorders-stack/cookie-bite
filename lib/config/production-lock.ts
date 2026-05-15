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

const REQUIRED_PROD_KEYS = [
  // App
  "NEXT_PUBLIC_APP_URL",
  "APP_BASE_URL",
  // Clerk
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  // Supabase
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_KEY",
  // Paymob
  "PAYMOB_API_KEY",
  "PAYMOB_HMAC",
  // Resend
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  // Internal
  "INTERNAL_API_SECRET",
] as const;

/** مجموعات متغيرات الإنتاج لكل تكامل — تُستخدم في لوحة الصحة وليست قياسات ping. */
export const INTEGRATION_ENV_GROUPS = {
  app_urls: ["NEXT_PUBLIC_APP_URL", "APP_BASE_URL"],
  clerk: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
  supabase: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"],
  paymob: ["PAYMOB_API_KEY", "PAYMOB_HMAC"],
  resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
  internal_api: ["INTERNAL_API_SECRET"],
} as const;

export type IntegrationEnvStatus = {
  [K in keyof typeof INTEGRATION_ENV_GROUPS]: boolean;
};

export type ProductionEnvCheck = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

function integrationGroupReady(missingKeys: ReadonlySet<string>, keys: readonly string[]): boolean {
  return !keys.some((k) => missingKeys.has(k));
}

/** في التطوير: الكل سليم. في الإنتاج: وفق مجموعات المتغيرات المفقودة. */
export function getIntegrationEnvStatus(check: ProductionEnvCheck): IntegrationEnvStatus {
  if (process.env.NODE_ENV !== "production") {
    return {
      app_urls: true,
      clerk: true,
      supabase: true,
      paymob: true,
      resend: true,
      internal_api: true,
    };
  }
  const m = new Set(check.missing);
  return {
    app_urls: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.app_urls),
    clerk: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.clerk),
    supabase: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.supabase),
    paymob: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.paymob),
    resend: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.resend),
    internal_api: integrationGroupReady(m, INTEGRATION_ENV_GROUPS.internal_api),
  };
}

export function checkProductionEnv(): ProductionEnvCheck {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (process.env.NODE_ENV !== "production") {
    return { ok: true, missing, warnings: ["non-production environment"] };
  }

  for (const key of REQUIRED_PROD_KEYS) {
    const v = process.env[key];
    if (!v || v.trim() === "" || v.includes("REPLACE_ME")) {
      missing.push(key);
    }
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
