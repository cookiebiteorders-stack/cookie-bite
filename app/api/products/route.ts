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
import { getPublicCacheHeaders } from "@/lib/cache-headers";
import { deduplicateRequest, generateDedupKey } from "@/lib/request-deduplication";

const SORT_MAP = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price_egp", ascending: true },
  price_desc: { column: "price_egp", ascending: false },
  popular: { column: "created_at", ascending: false },
} as const;

const LIST_CACHE_HEADERS = getPublicCacheHeaders('medium');

export async function GET(req: NextRequest) {
  try {
    const cached = await readProductsListCache(req.nextUrl.searchParams);
    if (cached) {
      const response = new NextResponse(cached, { status: 200 });
      response.headers.set("Content-Type", "application/json");
      Object.entries(LIST_CACHE_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
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

    // Deduplicate identical requests
    const dedupKey = generateDedupKey('products-list', {
      category: query.category,
      season: query.season,
      min_price: query.min_price,
      max_price: query.max_price,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });

    const { data, error, count } = await deduplicateRequest(
      dedupKey,
      async () => {
        const result = await q;
        return result;
      },
      5000
    );
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

    const response = new NextResponse(body, { status: 200 });
    response.headers.set("Content-Type", "application/json");
    Object.entries(LIST_CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;  } catch (err) {
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
