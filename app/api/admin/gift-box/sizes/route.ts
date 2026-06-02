import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

const sizeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(120),
  max_items: z.number().int().min(1).max(200),
  image_url: z.string().max(1200).nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  await requireAdminAccess("products");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_box_sizes")
    .select("id, code, name, max_items, image_url, is_active, sort_order")
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), { status: 500 });
  }
  return NextResponse.json({ sizes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const parsed = sizeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("gift_box_sizes").insert(parsed.data).select("*").single();
  if (error) {
    return NextResponse.json(bilingualError("Failed to create size", "فشل إنشاء الحجم"), { status: 500 });
  }
  return NextResponse.json({ ok: true, size: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const parsed = sizeSchema.extend({ id: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { id, ...patch } = parsed.data;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("gift_box_sizes").update(patch).eq("id", id).select("*").single();
  if (error) {
    return NextResponse.json(bilingualError("Failed to update size", "فشل تحديث الحجم"), { status: 500 });
  }
  return NextResponse.json({ ok: true, size: data });
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
  const { error } = await supabase.from("gift_box_sizes").delete().eq("id", parsed.data.id);
  if (error) {
    return NextResponse.json(bilingualError("Failed to delete size", "فشل حذف الحجم"), { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
