import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const patchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  category: z.string().min(2).max(80).optional(),
  amount_egp: z.number().positive().optional(),
  expense_date: z.string().date().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid expense id", "معرّف المصروف غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("financial");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();

  const patch = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      bilingualError("No fields to update", "لا توجد حقول للتحديث"),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      bilingualError("Failed to update expense", "فشل تحديث المصروف"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "financial.expense_update",
    module: "financial",
    entity_id: id,
    before: before ?? null,
    after: data,
    request: req,
  });

  return NextResponse.json({ ok: true, expense: data });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid expense id", "معرّف المصروف غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("financial");
  requireWritePermission(actor);

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to delete expense", "فشل حذف المصروف"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "financial.expense_delete",
    module: "financial",
    entity_id: id,
    before: before ?? null,
    after: null,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
