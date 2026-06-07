import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeSystemAudit } from "@/lib/admin/audit";
import { runProductCatalogAutomation } from "@/lib/admin/run-product-catalog-automation";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/product-catalog-automation
 * Scheduled publish, discount expiry, stock rules, low-stock email alerts.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const result = await runProductCatalogAutomation(supabase);

  await writeSystemAudit("products.run_automation", "products", {
    metadata: { ...result, source: "cron" },
  });

  return NextResponse.json({ ok: true, ...result });
}
