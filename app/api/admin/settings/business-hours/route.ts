import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  getBusinessSettings,
  updateBusinessSettings,
} from "@/lib/store/business-settings-server";
import { zodPayloadError } from "@/lib/validations/zod-errors";

const patchSchema = z.object({
  hours_en: z.string().trim().min(2).max(200).optional(),
  hours_ar: z.string().trim().min(2).max(200).optional(),
});

export async function GET() {
  await requireAdminAccess("settings");
  const settings = await getBusinessSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  if (!parsed.data.hours_en && !parsed.data.hours_ar) {
    return NextResponse.json(
      {
        error: {
          en: "Provide hours_en and/or hours_ar",
          ar: "أدخل hours_en و/أو hours_ar",
        },
      },
      { status: 400 },
    );
  }

  const before = await getBusinessSettings();
  const settings = await updateBusinessSettings(parsed.data, actor.user_id);

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "settings.business_hours_update",
    module: "settings",
    metadata: { patch: parsed.data },
    before,
    after: settings,
    request: req,
  });

  return NextResponse.json({ ok: true, settings });
}
