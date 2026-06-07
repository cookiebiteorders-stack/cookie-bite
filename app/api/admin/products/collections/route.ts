import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import { deriveProductSlug } from "@/lib/products/slug";
import { writeAuditLog } from "@/lib/admin/audit";

const createSchema = z.object({
  name_en: z.string().min(2).max(120),
  name_ar: z.string().max(120).optional().nullable(),
  slug: z.string().min(2).max(120).optional(),
  description_en: z.string().max(500).optional().nullable(),
  product_ids: z.array(z.string().uuid()).optional(),
});

export async function GET() {
  await requireAdminAccess("products");
  const supabase = createSupabaseAdminClient();
  const { data: collections, error } = await supabase
    .from("product_collections")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to load collections", "فشل تحميل المجموعات"),
      { status: 500 },
    );
  }

  const { data: items } = await supabase
    .from("product_collection_items")
    .select("collection_id, product_id, sort_order");

  const countByCollection = new Map<string, number>();
  for (const item of items ?? []) {
    const id = String(item.collection_id);
    countByCollection.set(id, (countByCollection.get(id) ?? 0) + 1);
  }

  return NextResponse.json({
    collections: (collections ?? []).map((c) => ({
      ...c,
      product_count: countByCollection.get(String(c.id)) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const slug = deriveProductSlug(parsed.data.name_en, parsed.data.slug?.trim());

  const { data: collection, error } = await supabase
    .from("product_collections")
    .insert({
      slug,
      name_en: parsed.data.name_en.trim(),
      name_ar: parsed.data.name_ar?.trim() || null,
      description_en: parsed.data.description_en?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to create collection", "فشل إنشاء المجموعة"),
      { status: 500 },
    );
  }

  const productIds = parsed.data.product_ids ?? [];
  if (productIds.length > 0) {
    await supabase.from("product_collection_items").insert(
      productIds.map((product_id, sort_order) => ({
        collection_id: collection.id,
        product_id,
        sort_order,
      })),
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.collection_create",
    module: "products",
    entity_id: String(collection.id),
    after: collection,
    request: req,
  });

  return NextResponse.json({ ok: true, collection }, { status: 201 });
}
