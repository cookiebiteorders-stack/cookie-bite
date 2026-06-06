import type { ProductionEnvCheck, IntegrationEnvStatus } from "@/lib/config/production-lock";
import { CORE_HEALTH_CARD_KEYS, INTEGRATION_FIX_HINTS } from "@/lib/admin/settings-integrations";
import type { SchemaHealthReport } from "@/lib/db/schema-health";

export type StoreHealthStatus = "healthy" | "degraded" | "critical";

export type StoreHealthIssue = {
  id: string;
  severity: "critical" | "warning";
  /** i18n key under settings.healthIssues.* */
  titleKey: string;
  fixKey: string;
  keys?: string[];
  tables?: string[];
};

export type StoreHealthReport = {
  status: StoreHealthStatus;
  issues: StoreHealthIssue[];
};

export function computeStoreHealth(input: {
  env: ProductionEnvCheck;
  database: SchemaHealthReport | null;
  cronConfigured: boolean;
  integrations: IntegrationEnvStatus;
}): StoreHealthReport {
  const issues: StoreHealthIssue[] = [];

  if (process.env.NODE_ENV !== "production") {
    if (input.env.warnings.length) {
      issues.push({
        id: "dev_warnings",
        severity: "warning",
        titleKey: "devWarnings",
        fixKey: "devWarningsFix",
      });
    }
    return { status: "healthy", issues };
  }

  if (!input.env.ok && input.env.missing.length) {
    const paymobKeys = input.env.missing.filter((k) => k.startsWith("PAYMOB_"));
    const otherKeys = input.env.missing.filter((k) => !k.startsWith("PAYMOB_"));

    if (paymobKeys.length) {
      issues.push({
        id: "paymob_missing",
        severity: "critical",
        titleKey: "paymobMissing",
        fixKey: "paymobMissingFix",
        keys: paymobKeys,
      });
    }
    if (otherKeys.length) {
      issues.push({
        id: "env_missing",
        severity: "critical",
        titleKey: "envMissing",
        fixKey: "envMissingFix",
        keys: otherKeys,
      });
    }
  }

  for (const cardKey of CORE_HEALTH_CARD_KEYS) {
    if (!input.integrations[cardKey]) {
      const keys = INTEGRATION_FIX_HINTS[cardKey].filter((k) =>
        input.env.missing.includes(k),
      );
      if (keys.length) continue;
      issues.push({
        id: `integration_${cardKey}`,
        severity: "critical",
        titleKey: "integrationDown",
        fixKey: "integrationDownFix",
        keys: INTEGRATION_FIX_HINTS[cardKey],
      });
    }
  }

  if (input.database && !input.database.ok) {
    if (input.database.missing_tables.length) {
      issues.push({
        id: "db_missing_tables",
        severity: "critical",
        titleKey: "dbMissingTables",
        fixKey: "dbMissingTablesFix",
        tables: input.database.missing_tables,
      });
    } else if (input.database.failed_tables.length) {
      issues.push({
        id: "db_failed_tables",
        severity: "critical",
        titleKey: "dbFailedTables",
        fixKey: "dbFailedTablesFix",
        tables: input.database.failed_tables,
      });
    } else if (!input.database.configured) {
      issues.push({
        id: "db_not_configured",
        severity: "critical",
        titleKey: "dbNotConfigured",
        fixKey: "dbNotConfiguredFix",
      });
    }
  }

  if (!input.cronConfigured) {
    issues.push({
      id: "cron_missing",
      severity: "warning",
      titleKey: "cronMissing",
      fixKey: "cronMissingFix",
      keys: ["INTERNAL_API_SECRET"],
    });
  }

  for (const warning of input.env.warnings) {
    if (warning.includes("GEMINI_API_KEY")) {
      issues.push({
        id: "gemini_optional",
        severity: "warning",
        titleKey: "geminiOptional",
        fixKey: "geminiOptionalFix",
        keys: ["GEMINI_API_KEY"],
      });
    } else if (warning.includes("Sanity")) {
      issues.push({
        id: "sanity_optional",
        severity: "warning",
        titleKey: "sanityOptional",
        fixKey: "sanityOptionalFix",
        keys: ["NEXT_PUBLIC_SANITY_PROJECT_ID", "NEXT_PUBLIC_SANITY_DATASET"],
      });
    } else if (warning.includes("NEXT_PUBLIC_APP_URL")) {
      issues.push({
        id: "app_url_mismatch",
        severity: "warning",
        titleKey: "appUrlMismatch",
        fixKey: "appUrlMismatchFix",
        keys: ["NEXT_PUBLIC_APP_URL", "APP_BASE_URL"],
      });
    }
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  const status: StoreHealthStatus = hasCritical
    ? "critical"
    : issues.length > 0
      ? "degraded"
      : "healthy";

  return { status, issues };
}
