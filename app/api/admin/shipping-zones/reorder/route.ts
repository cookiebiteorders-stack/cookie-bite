import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { invalidatePublicShippingZonesCache } from "@/lib/shipping/public-zones-server";

const bodySchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("shipping");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  for (let i = 0; i < parsed.data.orderedIds.length; i++) {
    const zoneId = parsed.data.orderedIds[i];
    const { error } = await supabase
      .from("shipping_zones")
      .update({ sort_order: i * 10, updated_at: now })
      .eq("id", zoneId);
    if (error) {
      console.error("[shipping-zones/reorder]", error);
      return NextResponse.json(
        bilingualError("Failed to reorder zones", "فشل إعادة ترتيب المناطق"),
        { status: 500 },
      );
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "shipping.zones_reorder",
    module: "shipping",
    metadata: { orderedIds: parsed.data.orderedIds },
    request: req,
  });

  invalidatePublicShippingZonesCache();

  return NextResponse.json({ ok: true });
}
