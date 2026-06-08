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

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  cities: z.array(z.string().min(1)).optional(),
  base_fee_egp: z.number().min(0).optional(),
  free_shipping_threshold_egp: z.number().min(0).nullable().optional(),
  eta_min_days: z.number().int().min(0).optional(),
  eta_max_days: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  center_lat: z.number().min(-90).max(90).nullable().optional(),
  center_lng: z.number().min(-180).max(180).nullable().optional(),
  radius_km: z.number().min(1).max(500).nullable().optional(),
  map_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid zone id", "معرّف المنطقة غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("shipping");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("shipping_zones")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const patch = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      bilingualError("No fields to update", "لا توجد حقول للتحديث"),
      { status: 400 },
    );
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("shipping_zones")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to update zone", "فشل تحديث المنطقة"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "shipping.zone_update",
    module: "shipping",
    entity_id: id,
    before: before ?? null,
    after: data,
    request: req,
  });

  invalidatePublicShippingZonesCache();

  return NextResponse.json({ ok: true, zone: data });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid zone id", "معرّف المنطقة غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("shipping");
  requireWritePermission(actor);

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("shipping_zones")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("shipping_zones").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to delete zone", "فشل حذف المنطقة"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "shipping.zone_delete",
    module: "shipping",
    entity_id: id,
    before: before ?? null,
    after: null,
    request: req,
  });

  invalidatePublicShippingZonesCache();

  return NextResponse.json({ ok: true });
}
