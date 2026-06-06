import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";
import type { ProductRow } from "@/lib/db/types";

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token?.trim()) {
    return NextResponse.json(bilingualError("Not found", "غير موجود"), { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: share, error } = await supabase
    .from("wishlist_shares")
    .select("id, title, product_ids, created_at, expires_at")
    .eq("share_token", token.trim())
    .maybeSingle();

  if (error || !share) {
    return NextResponse.json(bilingualError("Not found", "غير موجود"), { status: 404 });
  }

  if (share.expires_at && new Date(share.expires_at) <= new Date()) {
    return NextResponse.json(bilingualError("Link expired", "انتهت صلاحية الرابط"), {
      status: 410,
    });
  }

  const ids = Array.isArray(share.product_ids)
    ? (share.product_ids as string[]).filter(Boolean)
    : [];
  if (!ids.length) {
    return NextResponse.json({ title: share.title, products: [] });
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .in("id", ids)
    .eq("is_active", true);

  const order = new Map(ids.map((id, i) => [id, i]));
  const mapped = (products ?? [])
    .map((row) => productRowToStorefrontProduct(row as ProductRow, FALLBACK_DESC))
    .sort((a, b) => {
      const ai = order.get(a.productUuid ?? "") ?? 999;
      const bi = order.get(b.productUuid ?? "") ?? 999;
      return ai - bi;
    });

  return NextResponse.json({
    title: share.title,
    products: mapped,
    created_at: share.created_at,
  });
}
