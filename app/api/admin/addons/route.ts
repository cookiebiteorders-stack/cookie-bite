import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { addonSchema } from "@/lib/addons/validation";
import { bilingualError } from "@/lib/validations";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";

const updateSchema = addonSchema.extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  await requireAdminAccess("products");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("addons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), { status: 500 });
  }
  return NextResponse.json({ addons: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const parsed = addonSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("addons").insert(parsed.data).select("*").single();
  if (error) {
    return NextResponse.json(bilingualError("Failed to create add-on", "فشل إنشاء الإضافة"), { status: 500 });
  }
  return NextResponse.json({ ok: true, addon: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, ...patch } = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("addons").update(patch).eq("id", id).select("*").single();
  if (error) {
    return NextResponse.json(bilingualError("Failed to update add-on", "فشل تحديث الإضافة"), { status: 500 });
  }
  return NextResponse.json({ ok: true, addon: data });
}

export async function DELETE(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("addons").delete().eq("id", parsed.data.id);
  if (error) {
    return NextResponse.json(bilingualError("Failed to delete add-on", "فشل حذف الإضافة"), { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
