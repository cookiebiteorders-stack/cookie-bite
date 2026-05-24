import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const geoFields = {
  center_lat: z.number().min(-90).max(90).nullable().optional(),
  center_lng: z.number().min(-180).max(180).nullable().optional(),
  radius_km: z.number().min(1).max(500).nullable().optional(),
  map_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullable()
    .optional(),
};

const createSchema = z.object({
  name: z.string().min(2).max(120),
  cities: z.array(z.string().min(1)).default([]),
  base_fee_egp: z.number().min(0),
  free_shipping_threshold_egp: z.number().min(0).nullable().optional(),
  eta_min_days: z.number().int().min(0).default(1),
  eta_max_days: z.number().int().min(0).default(3),
  is_active: z.boolean().default(true),
  ...geoFields,
});

export async function GET() {
  await requireAdminAccess("shipping");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shipping_zones")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("shipping");
  requireWritePermission(actor);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: maxRow } = await supabase
    .from("shipping_zones")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (Number((maxRow as { sort_order?: number } | null)?.sort_order) || 0) + 10;

  const { data, error } = await supabase
    .from("shipping_zones")
    .insert({ ...parsed.data, sort_order: nextSort })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to create shipping zone", "فشل إنشاء منطقة الشحن"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "shipping.zone_create",
    module: "shipping",
    entity_id: data.id,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, zone: data });
}

