import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  checkProductionEnv,
  getIntegrationEnvStatus,
  PRODUCTION_HOST,
} from "@/lib/config/production-lock";

export async function GET() {
  await requireAdminAccess("settings");
  const env = checkProductionEnv();
  const integrations = getIntegrationEnvStatus(env);
  return NextResponse.json({
    canonical_host: PRODUCTION_HOST,
    env,
    integrations,
    node_env: process.env.NODE_ENV ?? "development",
  });
}

