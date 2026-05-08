import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!slug || slug.length < 1) {
    return NextResponse.json(
      { error: { en: "Missing slug", ar: "الرمز مفقود" } },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, images, badges, dietary, seasons, category, stock, weight_grams, pieces_count, sku, created_at",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("/api/products/[slug] error", error);
    return NextResponse.json(
      { error: { en: "Database error", ar: "خطأ في قاعدة البيانات" } },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { en: "Product not found", ar: "المنتج غير موجود" } },
      { status: 404 },
    );
  }

  const { data: reviewsAgg } = await supabase
    .from("reviews")
    .select("rating", { count: "exact" })
    .eq("product_id", data.id)
    .eq("is_approved", true);

  const ratings = (reviewsAgg ?? []).map((r) => r.rating);
  const avg_rating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null;

  return NextResponse.json(
    {
      product: data,
      review_count: ratings.length,
      avg_rating,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
