import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("discounts");
  requireWritePermission(actor);
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: source, error: loadErr } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !source) {
    return NextResponse.json(
      bilingualError("Discount not found", "الخصم غير موجود"),
      { status: 404 },
    );
  }

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const base = String(source.code).replace(/-COPY.*$/i, "").slice(0, 28);
  const newCode = `${base}-COPY-${suffix}`;

  const { id: _id, created_at: _c, used_count: _u, code: _code, ...rest } = source as Record<
    string,
    unknown
  >;

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      ...rest,
      code: newCode,
      used_count: 0,
      is_active: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to duplicate", "فشل نسخ الخصم"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "discount.duplicate",
    module: "discounts",
    entity_id: data.id as string,
    metadata: { source_id: id, source_code: source.code },
    request: req,
  });

  return NextResponse.json({ ok: true, discount: data });
}
