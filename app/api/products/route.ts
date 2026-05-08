import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { productsQuerySchema } from "@/lib/validations";

const SORT_MAP = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price_egp", ascending: true },
  price_desc: { column: "price_egp", ascending: false },
  popular: { column: "created_at", ascending: false },
} as const;

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const query = productsQuerySchema.parse(params);

    const supabase = await createSupabaseServerClient();
    let q = supabase
      .from("products")
      .select(
        "id, slug, name, title_en, title_ar, description, description_en, description_ar, price_egp, compare_price_egp, image_url, images, badges, dietary, seasons, category, is_active, stock, weight_grams, pieces_count, created_at",
        { count: "exact" },
      )
      .eq("is_active", true);

    if (query.category) q = q.eq("category", query.category);
    if (query.season) q = q.contains("seasons", [query.season]);
    if (query.min_price !== undefined) q = q.gte("price_egp", query.min_price);
    if (query.max_price !== undefined) q = q.lte("price_egp", query.max_price);

    const { column, ascending } = SORT_MAP[query.sort];
    q = q.order(column, { ascending });

    const offset = (query.page - 1) * query.limit;
    q = q.range(offset, offset + query.limit - 1);

    const { data, error, count } = await q;
    if (error) {
      console.error("/api/products error", error);
      return NextResponse.json(
        { error: { en: "Database error", ar: "خطأ في قاعدة البيانات" } },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        products: data ?? [],
        total: count ?? 0,
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil((count ?? 0) / query.limit),
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            en: "Invalid query parameters",
            ar: "معاملات الاستعلام غير صالحة",
          },
          details: err.flatten(),
        },
        { status: 400 },
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: { en: "Server error", ar: "خطأ في الخادم" } },
      { status: 500 },
    );
  }
}
