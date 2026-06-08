import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  getCommerceSettings,
  updateCommerceSettings,
} from "@/lib/store/commerce-settings-server";
import { zodPayloadError } from "@/lib/validations/zod-errors";

const patchSchema = z.object({
  free_shipping_threshold_egp: z.number().min(0).max(1_000_000).optional(),
});

export async function GET() {
  await requireAdminAccess("discounts");
  const settings = await getCommerceSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  if (parsed.data.free_shipping_threshold_egp == null) {
    return NextResponse.json(
      {
        error: {
          en: "Provide free_shipping_threshold_egp",
          ar: "أدخل free_shipping_threshold_egp",
        },
      },
      { status: 400 },
    );
  }

  const before = await getCommerceSettings();
  const settings = await updateCommerceSettings(parsed.data, actor.user_id);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "discounts.commerce_settings_update",
    module: "discounts",
    metadata: { patch: parsed.data },
    before,
    after: settings,
    request: req,
  });

  return NextResponse.json({ ok: true, settings });
}
