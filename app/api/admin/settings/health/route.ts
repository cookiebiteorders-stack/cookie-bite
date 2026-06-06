import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  checkProductionEnv,
  getIntegrationEnvStatus,
  PRODUCTION_HOST,
} from "@/lib/config/production-lock";
import { probeAdminRlsHelper, probeAppDatabaseTables } from "@/lib/db/schema-health";
import { computeStoreHealth } from "@/lib/config/store-health";

export async function GET() {
  const actor = await requireAdminAccess("settings");
  const env = checkProductionEnv();
  const integrations = getIntegrationEnvStatus(env);
  const database = await probeAppDatabaseTables();
  const rls_helper = await probeAdminRlsHelper();

  const cronConfigured = Boolean(process.env.INTERNAL_API_SECRET?.trim());
  const store_health = computeStoreHealth({
    env,
    database,
    cronConfigured,
    integrations,
  });

  return NextResponse.json({
    canonical_host: PRODUCTION_HOST,
    store_health,
    env,
    integrations,
    cron: {
      configured: cronConfigured,
      endpoints: [
        "POST /api/cron/notification-jobs",
        "POST /api/cron/email-worker",
        "POST /api/cron/email-health",
        "POST /api/cron/abandoned-cart-reminders",
        "POST /api/cron/order-lifecycle-purge",
      ],
      schedule_hint: "every 5–60 minutes (Hostinger cron)",
      auth_header: "x-internal-secret",
    },
    database: {
      ok: database.ok && rls_helper.ok,
      configured: database.configured,
      missing_tables: database.missing_tables,
      failed_tables: database.failed_tables,
      rls_helper,
      migrate_hint:
        database.missing_tables.length > 0
          ? "Run: npm run supabase:ensure-schema (requires SUPABASE_ACCESS_TOKEN locally)"
          : undefined,
    },
    node_env: process.env.NODE_ENV ?? "development",
    actor: { role: actor.role },
  });
}

