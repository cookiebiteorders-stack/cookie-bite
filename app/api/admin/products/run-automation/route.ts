import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { runProductCatalogAutomation } from "@/lib/admin/run-product-catalog-automation";

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const supabase = createSupabaseAdminClient();
  const result = await runProductCatalogAutomation(supabase);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.run_automation",
    module: "products",
    metadata: { ...result, source: "admin" },
    request: req,
  });

  return NextResponse.json({ ok: true, ...result });
}
