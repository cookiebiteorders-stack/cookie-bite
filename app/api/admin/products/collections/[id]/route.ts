import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import { deriveProductSlug } from "@/lib/products/slug";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { revalidatePath } from "next/cache";

const patchSchema = z.object({
  name_en: z.string().min(2).max(120).optional(),
  name_ar: z.string().max(120).optional().nullable(),
  slug: z.string().min(2).max(120).optional(),
  description_en: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
  product_ids: z.array(z.string().uuid()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  await requireAdminAccess("products");
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: collection, error } = await supabase
    .from("product_collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !collection) {
    return NextResponse.json(
      bilingualError("Collection not found", "المجموعة غير موجودة"),
      { status: error ? 500 : 404 },
    );
  }

  const { data: items } = await supabase
    .from("product_collection_items")
    .select("product_id, sort_order, products(id, slug, name, title_en, title_ar, sku, price_egp, stock, is_active, image_url)")
    .eq("collection_id", id)
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    collection,
    products: (items ?? []).map((item) => {
      const product = item.products as unknown as Record<string, unknown> | null;
      return {
        sort_order: item.sort_order,
        ...(product ?? {}),
      };
    }),
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const { id } = await context.params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase
    .from("product_collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!before) {
    return NextResponse.json(bilingualError("Collection not found", "المجموعة غير موجودة"), {
      status: 404,
    });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name_en) {
    patch.name_en = parsed.data.name_en.trim();
    if (!parsed.data.slug) {
      patch.slug = deriveProductSlug(parsed.data.name_en);
    }
  }
  if (parsed.data.name_ar !== undefined) patch.name_ar = parsed.data.name_ar?.trim() || null;
  if (parsed.data.slug) patch.slug = deriveProductSlug(parsed.data.name_en ?? before.name_en, parsed.data.slug);
  if (parsed.data.description_en !== undefined) {
    patch.description_en = parsed.data.description_en?.trim() || null;
  }
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;

  const { data: collection, error } = await supabase
    .from("product_collections")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to update collection", "فشل تحديث المجموعة"),
      { status: 500 },
    );
  }

  if (parsed.data.product_ids) {
    await supabase.from("product_collection_items").delete().eq("collection_id", id);
    const productIds = parsed.data.product_ids;
    if (productIds.length > 0) {
      await supabase.from("product_collection_items").insert(
        productIds.map((product_id, sort_order) => ({
          collection_id: id,
          product_id,
          sort_order,
        })),
      );
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.collection_update",
    module: "products",
    entity_id: id,
    before,
    after: collection,
    metadata: { product_ids: parsed.data.product_ids },
    request: req,
  });

  try {
    await revalidateStorefrontCatalog();
    revalidatePath("/shop");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true, collection });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: before } = await supabase
    .from("product_collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("product_collections").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to delete collection", "فشل حذف المجموعة"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.collection_delete",
    module: "products",
    entity_id: id,
    before,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
