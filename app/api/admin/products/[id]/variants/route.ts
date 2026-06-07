import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";
import { zodPayloadError } from "@/lib/validations/zod-errors";
import {
  listLinkedTagIdsByProductId,
  listProductVariants,
  replaceProductVariants,
  type ProductVariantInput,
} from "@/lib/db/product-catalog";

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  sku: z.string().max(80).nullable().optional(),
  barcode: z.string().max(80).nullable().optional(),
  price_egp: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0),
  options: z.record(z.string(), z.unknown()).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

const putSchema = z.object({
  variants: z.array(variantSchema).max(50),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  await requireAdminAccess("products");
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();
  const variants = await listProductVariants(supabase, id);
  return NextResponse.json({ variants });
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const { id } = await context.params;
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(zodPayloadError(parsed.error), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product } = await supabase.from("products").select("id").eq("id", id).maybeSingle();
  if (!product) {
    return NextResponse.json(bilingualError("Product not found", "المنتج غير موجود"), { status: 404 });
  }

  const before = await listProductVariants(supabase, id);
  const variants = await replaceProductVariants(
    supabase,
    id,
    parsed.data.variants as ProductVariantInput[],
  );

  const tagIds = await listLinkedTagIdsByProductId(supabase, id);

  const totalVariantStock = variants.reduce((sum, v) => sum + (v.is_active ? v.stock : 0), 0);
  if (variants.length > 0) {
    await supabase.from("products").update({ stock: totalVariantStock }).eq("id", id);
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "products.variants_update",
    module: "products",
    entity_id: id,
    before,
    after: variants,
    request: req,
  });

  return NextResponse.json({ ok: true, variants, tag_ids: tagIds });
}
