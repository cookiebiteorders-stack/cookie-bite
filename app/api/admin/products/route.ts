import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  requireAdminAccess,
  requireFullPermission,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";
import {
  normalizeProductImages,
  primaryImageFromProduct,
} from "@/lib/products/media";
import {
  productBadgesSchema,
  productImagesSchema,
  productMediaUrlSchema,
  productSeasonsSchema,
  productVideoUrlSchema,
} from "@/lib/validations/product-media";
import { deriveProductSlug } from "@/lib/products/slug";
import { insertProductWithSlugRetry } from "@/lib/products/insert-product";
import { zodPayloadError } from "@/lib/validations/zod-errors";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  low_stock: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  category: z.string().max(120).optional(),
  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().nonnegative().optional(),
  stock_state: z.enum(["in_stock", "low", "out"]).optional(),
  discounted: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
});

const bulkPatchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  patch: z
    .object({
      name: z.string().min(2).max(160).optional(),
      title_en: z.string().max(160).nullable().optional(),
      title_ar: z.string().max(160).nullable().optional(),
      description_en: z.string().max(3000).nullable().optional(),
      description_ar: z.string().max(3000).nullable().optional(),
      description: z.string().max(3000).nullable().optional(),
      price_egp: z.number().positive().optional(),
      stock: z.number().int().min(0).optional(),
      is_active: z.boolean().optional(),
      category: z.string().max(100).nullable().optional(),
      sku: z.string().max(80).nullable().optional(),
      slug: z.string().min(2).max(180).optional(),
      image_url: productMediaUrlSchema.nullable().optional(),
      images: productImagesSchema,
      video_url: productVideoUrlSchema,
      badges: productBadgesSchema,
      seasons: productSeasonsSchema,
      weight_grams: z.number().int().positive().nullable().optional(),
      pieces_count: z.number().int().positive().nullable().optional(),
      dietary: z.array(z.string().max(120)).optional(),
      compare_price_egp: z.number().positive().nullable().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, {
      message: "patch is required",
    }),
});

const createProductSchema = z.object({
  name: z.string().min(2).max(160),
  title_en: z.string().max(160).optional().nullable(),
  title_ar: z.string().max(160).optional().nullable(),
  slug: z.string().min(2).max(180).optional(),
  description_en: z.string().max(3000).optional().nullable(),
  description_ar: z.string().max(3000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  sku: z.string().max(80).optional().nullable(),
  price_egp: z.number().positive(),
  stock: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  image_url: productMediaUrlSchema.optional().nullable(),
  images: productImagesSchema,
  video_url: productVideoUrlSchema,
  badges: productBadgesSchema,
  seasons: productSeasonsSchema,
  weight_grams: z.number().int().positive().nullable().optional(),
  pieces_count: z.number().int().positive().nullable().optional(),
  dietary: z.array(z.string().max(120)).optional(),
  compare_price_egp: z.number().positive().nullable().optional(),
});

function resolveProductMedia(input: {
  images?: z.infer<typeof productImagesSchema>;
  image_url?: string | null;
}) {
  const images = normalizeProductImages(input.images, input.image_url ?? null);
  const image_url = primaryImageFromProduct(images, input.image_url ?? null);
  return { images, image_url };
}

function applyPatchMedia(
  patch: z.infer<typeof bulkPatchSchema>["patch"],
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...patch };
  if ("images" in patch || "image_url" in patch) {
    const { images, image_url } = resolveProductMedia({
      images: patch.images,
      image_url: patch.image_url ?? null,
    });
    next.images = images;
    next.image_url = image_url;
  }
  if ("slug" in patch && patch.slug) {
    next.slug = deriveProductSlug("", patch.slug);
  }
  return next;
}

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

async function loadCatalogStats(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const [
    { count: total },
    { count: active },
    { count: draft },
    { count: out_of_stock },
    { count: low_stock },
    { data: pipelineRows },
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 0),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gt("stock", 0)
      .lte("stock", 10),
    supabase.from("products").select("price_egp, stock").eq("is_active", true).limit(5000),
  ]);

  const revenue_estimate_egp = (pipelineRows ?? []).reduce(
    (sum, row) => sum + Number(row.price_egp ?? 0) * Number(row.stock ?? 0),
    0,
  );

  return {
    total: total ?? 0,
    active: active ?? 0,
    draft: draft ?? 0,
    out_of_stock: out_of_stock ?? 0,
    low_stock: low_stock ?? 0,
    revenue_estimate_egp,
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "بارامترات غير صالحة"), {
      status: 400,
    });
  }

  const {
    page,
    limit,
    search,
    low_stock,
    active,
    category,
    price_min,
    price_max,
    stock_state,
    discounted,
    featured,
  } = parsed.data;
  const supabase = createSupabaseAdminClient();
  let db = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });

  if (search?.trim()) {
    const clause = buildIlikeOrClause(
      ["slug", "name", "sku", "category"],
      search,
    );
    if (clause) db = db.or(clause);
  }
  if (typeof low_stock === "boolean" && low_stock) db = db.lte("stock", 10);
  if (typeof active === "boolean") db = db.eq("is_active", active);
  if (category?.trim()) db = db.ilike("category", `%${category.trim()}%`);
  if (typeof price_min === "number") db = db.gte("price_egp", price_min);
  if (typeof price_max === "number") db = db.lte("price_egp", price_max);
  if (stock_state === "in_stock") db = db.gt("stock", 10);
  if (stock_state === "low") db = db.gt("stock", 0).lte("stock", 10);
  if (stock_state === "out") db = db.lte("stock", 0);
  if (typeof discounted === "boolean" && discounted) {
    db = db.not("compare_price_egp", "is", null);
  }
  if (typeof featured === "boolean" && featured) {
    db = db.contains("badges", ["featured"]);
  }

  const offset = (page - 1) * limit;
  const [listResult, stats] = await Promise.all([
    db.range(offset, offset + limit - 1),
    loadCatalogStats(supabase),
  ]);

  const { data, count, error } = listResult;
  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({
    products: data ?? [],
    total: count ?? 0,
    page,
    limit,
    stats,
    meta: {
      role: actor.role,
      permission: actor.permission,
      can_write: actor.permission === "full" || actor.permission === "limited",
      can_delete: actor.permission === "full",
    },
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = createProductSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;

  const { images, image_url } = resolveProductMedia({
    images: payload.images,
    image_url: payload.image_url ?? null,
  });

  const buildRow = (slug: string) => ({
    slug,
    name: payload.name.trim(),
    title_en: payload.title_en ?? null,
    title_ar: payload.title_ar ?? null,
    description_en: payload.description_en ?? null,
    description_ar: payload.description_ar ?? null,
    description: payload.description_en ?? payload.description_ar ?? null,
    category: payload.category ?? null,
    sku: payload.sku ?? null,
    price_egp: payload.price_egp,
    compare_price_egp: payload.compare_price_egp ?? null,
    stock: payload.stock,
    is_active: payload.is_active,
    image_url,
    images,
    video_url: payload.video_url ?? null,
    badges: payload.badges ?? [],
    seasons: payload.seasons ?? [],
    weight_grams: payload.weight_grams ?? null,
    pieces_count: payload.pieces_count ?? null,
    dietary: payload.dietary ?? [],
  });

  const supabase = createSupabaseAdminClient();
  const inserted = await insertProductWithSlugRetry(
    supabase,
    payload.name.trim(),
    payload.slug?.trim(),
    buildRow,
  );

  if ("error" in inserted) {
    const code = String(inserted.error?.code ?? "");
    const status = code === "23505" ? 409 : 500;
    const hint = inserted.error?.message ? ` (${inserted.error.message})` : "";
    return NextResponse.json(
      {
        ...bilingualError(
          code === "23505" ? "Slug or SKU already exists" : `Failed to create product${hint}`,
          code === "23505"
            ? "الرابط (Slug) أو SKU مستخدم بالفعل — غيّر الاسم أو الـ Slug"
            : `فشل إضافة المنتج${hint}`,
        ),
        debug: process.env.NODE_ENV !== "production" ? inserted.error : undefined,
      },
      { status },
    );
  }

  const data = inserted.data;

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.create",
    module: "products",
    metadata: { product_id: data.id, slug: data.slug },
    after: data,
    request: req,
  });

  try {
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath(`/shop/${data.slug}`);
    revalidatePath("/api/products");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true, product: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bulkPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const { ids, patch } = parsed.data;
  const dbPatch = applyPatchMedia(patch);
  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("products").select("*").in("id", ids);
  const { data, error } = await supabase
    .from("products")
    .update(dbPatch)
    .in("id", ids)
    .select("*");

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to update products", "فشل تحديث المنتجات"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.bulk_update",
    module: "products",
    metadata: { ids, patch, updated_count: data?.length ?? 0 },
    before: before ?? null,
    after: data ?? null,
    request: req,
  });

  try {
    revalidatePath("/");
    revalidatePath("/shop");
    for (const row of data ?? []) {
      if (row?.slug) revalidatePath(`/shop/${row.slug}`);
    }
    revalidatePath("/api/products");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true, updated: data ?? [] });
}

export async function DELETE(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireFullPermission(actor);

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const ids = parsed.data.ids;
  const { data: before } = await supabase.from("products").select("*").in("id", ids);
  const { error } = await supabase.from("products").delete().in("id", ids);
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to delete products", "فشل حذف المنتجات"),
      { status: 500 },
    );
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.delete",
    module: "products",
    metadata: { ids, deleted_count: before?.length ?? 0 },
    before: before ?? null,
    request: req,
  });

  return NextResponse.json({ ok: true, deleted: ids.length });
}

