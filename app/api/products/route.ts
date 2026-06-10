import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { listActiveVariantsByProductIds } from "@/lib/db/product-catalog";
import {
  readProductsListCache,
  writeProductsListCache,
} from "@/lib/storefront/products-list-cache";
import { productsQuerySchema } from "@/lib/validations";

const SORT_MAP = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price_egp", ascending: true },
  price_desc: { column: "price_egp", ascending: false },
  popular: { column: "created_at", ascending: false },
} as const;

const LIST_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

export async function GET(req: NextRequest) {
  try {
    const cached = await readProductsListCache(req.nextUrl.searchParams);
    if (cached) {
      return new NextResponse(cached, {
        status: 200,
        headers: { "Content-Type": "application/json", ...LIST_CACHE_HEADERS },
      });
    }

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const query = productsQuerySchema.parse(params);
    const supabase = await createSupabaseServerClient();
    let q = supabase
      .from("products")
      .select(
        "id, slug, name, title_en, title_ar, description_en, description_ar, price_egp, compare_price_egp, image_url, images, badges, category, is_active, stock, created_at",
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

    const rows = (data ?? []) as Array<{ id: string } & Record<string, unknown>>;
    const adminClient = tryCreateSupabaseAdminClient();
    const variantsByProduct = adminClient
      ? await listActiveVariantsByProductIds(
          adminClient,
          rows.map((r) => r.id),
        )
      : new Map();
    const products = rows.map((row) => ({
      ...row,
      variants: variantsByProduct.get(row.id) ?? [],
    }));

    const payload = {
      products,
      total: count ?? 0,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil((count ?? 0) / query.limit),
    };
    const body = JSON.stringify(payload);
    void writeProductsListCache(req.nextUrl.searchParams, body);

    return new NextResponse(body, {
      status: 200,
      headers: { "Content-Type": "application/json", ...LIST_CACHE_HEADERS },
    });  } catch (err) {
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
