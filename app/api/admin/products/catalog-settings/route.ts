import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import {
  getProductCatalogSettings,
  updateProductCatalogSettings,
} from "@/lib/admin/product-catalog-automation";

const patchSchema = z.object({
  low_stock_threshold: z.number().int().min(0).max(10_000).optional(),
  auto_deactivate_zero_stock: z.boolean().optional(),
  email_alerts_enabled: z.boolean().optional(),
  alert_recipient_email: z.string().email().nullable().optional(),
  alert_cooldown_hours: z.number().int().min(1).max(168).optional(),
});

export async function GET() {
  await requireAdminAccess("products");
  const supabase = createSupabaseAdminClient();
  const settings = await getProductCatalogSettings(supabase);
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const before = await getProductCatalogSettings(supabase);
  const settings = await updateProductCatalogSettings(supabase, parsed.data);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.catalog_settings_update",
    module: "products",
    metadata: { patch: parsed.data },
    before,
    after: settings,
    request: req,
  });

  return NextResponse.json({ ok: true, settings });
}
