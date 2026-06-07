import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import {
  listLinkedTagIdsByProductId,
  listProductVariants,
  replaceProductTagLinks,
  replaceProductVariants,
} from "@/lib/db/product-catalog";
import { insertProductWithSlugRetry } from "@/lib/products/insert-product";
import { deriveProductSlug } from "@/lib/products/slug";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { revalidatePath } from "next/cache";
import { listLinkedAddonIdsByProductIds, replaceProductAddonLinks } from "@/lib/db/addons";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);
  const { id: sourceId } = await context.params;

  const supabase = createSupabaseAdminClient();
  const { data: source, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (error || !source) {
    return NextResponse.json(bilingualError("Product not found", "المنتج غير موجود"), {
      status: 404,
    });
  }

  const [variants, tagIds, addonMap] = await Promise.all([
    listProductVariants(supabase, sourceId),
    listLinkedTagIdsByProductId(supabase, sourceId),
    listLinkedAddonIdsByProductIds([sourceId]),
  ]);
  const addonIds = addonMap.get(sourceId) ?? [];

  const copyName = `Copy of ${String(source.name)}`.slice(0, 160);
  const baseSlug = deriveProductSlug(copyName);

  const buildRow = (slug: string) => ({
    slug,
    name: copyName,
    title_en: source.title_en ? `Copy — ${source.title_en}`.slice(0, 160) : null,
    title_ar: source.title_ar ? `نسخة — ${source.title_ar}`.slice(0, 160) : null,
    description_en: source.description_en ?? null,
    description_ar: source.description_ar ?? null,
    description: source.description ?? null,
    category: source.category ?? null,
    category_id: source.category_id ?? null,
    sku: null,
    barcode: null,
    meta_title: source.meta_title ?? null,
    meta_description: source.meta_description ?? null,
    price_egp: source.price_egp,
    compare_price_egp: source.compare_price_egp ?? null,
    stock: Math.max(0, Number(source.stock ?? 0)),
    is_active: false,
    image_url: source.image_url ?? null,
    images: source.images ?? [],
    video_url: source.video_url ?? null,
    badges: source.badges ?? [],
    seasons: source.seasons ?? [],
    weight_grams: source.weight_grams ?? null,
    pieces_count: source.pieces_count ?? null,
    dietary: source.dietary ?? [],
    publish_at: null,
    discount_ends_at: null,
  });

  const inserted = await insertProductWithSlugRetry(supabase, copyName, baseSlug, buildRow);
  if ("error" in inserted) {
    return NextResponse.json(
      bilingualError("Failed to duplicate product", "فشل تكرار المنتج"),
      { status: 500 },
    );
  }

  const product = inserted.data;
  const newId = String(product.id);

  if (variants.length > 0) {
    await replaceProductVariants(
      supabase,
      newId,
      variants.map((v, index) => ({
        name: v.name,
        sku: null,
        barcode: null,
        price_egp: v.price_egp,
        stock: v.stock,
        options: v.options,
        sort_order: v.sort_order ?? index,
        is_active: v.is_active,
      })),
    );
  }

  if (tagIds.length > 0) {
    await replaceProductTagLinks(supabase, newId, tagIds);
  }

  if (addonIds.length > 0) {
    await replaceProductAddonLinks(newId, addonIds);
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.duplicate",
    module: "products",
    entity_id: newId,
    metadata: { source_id: sourceId, source_slug: source.slug },
    before: source,
    after: product,
    request: req,
  });

  try {
    await revalidateStorefrontCatalog();
    revalidatePath("/admin/products");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true, product }, { status: 201 });
}
