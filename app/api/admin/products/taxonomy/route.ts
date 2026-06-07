import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import { listProductCategories, listProductTags } from "@/lib/db/product-catalog";
import { deriveProductSlug } from "@/lib/products/slug";

const createCategorySchema = z.object({
  type: z.literal("category"),
  name_en: z.string().min(2).max(100),
  name_ar: z.string().max(100).optional().nullable(),
  slug: z.string().min(2).max(120).optional(),
});

const createTagSchema = z.object({
  type: z.literal("tag"),
  name_en: z.string().min(2).max(80),
  name_ar: z.string().max(80).optional().nullable(),
  slug: z.string().min(2).max(100).optional(),
});

const createSchema = z.discriminatedUnion("type", [createCategorySchema, createTagSchema]);

export async function GET() {
  await requireAdminAccess("products");
  const supabase = createSupabaseAdminClient();
  const [categories, tags] = await Promise.all([
    listProductCategories(supabase),
    listProductTags(supabase),
  ]);
  return NextResponse.json({ categories, tags });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const payload = parsed.data;
  const slug = deriveProductSlug(payload.name_en, payload.slug?.trim());

  if (payload.type === "category") {
    const { data, error } = await supabase
      .from("product_categories")
      .insert({
        slug,
        name_en: payload.name_en.trim(),
        name_ar: payload.name_ar?.trim() || null,
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        bilingualError("Failed to create category", "فشل إنشاء التصنيف"),
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, category: data }, { status: 201 });
  }

  const { data, error } = await supabase
    .from("product_tags")
    .insert({
      slug,
      name_en: payload.name_en.trim(),
      name_ar: payload.name_ar?.trim() || null,
    })
    .select("*")
    .single();
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to create tag", "فشل إنشاء الوسم"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, tag: data }, { status: 201 });
}
