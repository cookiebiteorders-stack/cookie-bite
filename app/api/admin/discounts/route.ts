import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const createSchema = z.object({
  code: z.string().min(3).max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  /** ISO datetime — يُخزَّن كـ valid_from إن وُجد */
  starts_at: z.string().datetime().optional(),
  /** ISO datetime — يُخزَّن كـ valid_until إن وُجد */
  expires_at: z.string().datetime().optional(),
  max_uses: z.number().int().min(1).optional(),
  min_order_amount_egp: z.number().min(0).optional(),
  active: z.boolean().default(true),
});

export async function GET() {
  await requireAdminAccess("discounts");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  return NextResponse.json({ discounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: payload.code.toUpperCase(),
      type: payload.type,
      value: payload.value,
      valid_from: payload.starts_at ?? new Date().toISOString(),
      valid_until: payload.expires_at ?? null,
      max_uses: payload.max_uses ?? null,
      min_order_amount_egp: payload.min_order_amount_egp ?? 0,
      is_active: payload.active,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to create discount", "فشل إنشاء الخصم"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "discount.create",
    module: "discounts",
    entity_id: data.id,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, discount: data });
}
