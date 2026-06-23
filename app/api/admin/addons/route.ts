import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listAddonCategoriesWithItems } from "@/lib/db/addon-categories";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeAddonInput } from "@/lib/addons/submit-payload";
import { addonSchema } from "@/lib/addons/validation";
import { bilingualError } from "@/lib/validations";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";

const createAddonSchema = addonSchema.omit({ id: true });
const updateSchema = addonSchema.extend({ id: z.string().uuid() });
const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  await requireAdminAccess("addons");
  const categories = await listAddonCategoriesWithItems();
  const addons = categories
    .filter((c) => c.addon_id)
    .map((c) => ({
      id: c.addon_id!,
      name: c.name,
      description: c.description ?? null,
      type: c.selection_type,
      required: c.required,
      options: c.items ?? [],
      category_id: c.id,
    }));
  return NextResponse.json({ addons, categories });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);
  const body = normalizeAddonInput(await req.json().catch(() => null));
  const parsed = createAddonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("addons")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      required: parsed.data.required,
      options: parsed.data.options,
      category_id: parsed.data.category_id ?? null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("addons POST insert", error);
    return NextResponse.json(
      {
        ...bilingualError("Failed to create add-on", "فشل إنشاء الإضافة"),
        debug: { message: error.message, code: error.code },
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, addon: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);
  const parsed = updateSchema.safeParse(normalizeAddonInput(await req.json().catch(() => null)));
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
  const actor = await requireAdminAccess("addons");
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
