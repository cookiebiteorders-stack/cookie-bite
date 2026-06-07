import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import {
  listLinkedTagIdsByProductId,
  listProductVariants,
} from "@/lib/db/product-catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  await requireAdminAccess("products");
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: product, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error || !product) {
    return NextResponse.json(bilingualError("Product not found", "المنتج غير موجود"), { status: 404 });
  }

  const [variants, tag_ids] = await Promise.all([
    listProductVariants(supabase, id),
    listLinkedTagIdsByProductId(supabase, id),
  ]);

  return NextResponse.json({ product, variants, tag_ids });
}
