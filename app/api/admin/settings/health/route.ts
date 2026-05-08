import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { checkProductionEnv, PRODUCTION_HOST } from "@/lib/config/production-lock";

export async function GET() {
  await requireAdminAccess("settings");
  const env = checkProductionEnv();
  return NextResponse.json({
    canonical_host: PRODUCTION_HOST,
    env,
    node_env: process.env.NODE_ENV ?? "development",
  });
}

