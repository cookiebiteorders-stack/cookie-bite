import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createSupabaseServerClient();

  // المحاولة الأولى: full-text search على search_vector
  const { data: ftsData, error: ftsErr } = await supabase
    .from("products")
    .select(
      "id, slug, name, title_en, title_ar, price_egp, image_url, images",
    )
    .eq("is_active", true)
    .textSearch("search_vector", q, { type: "websearch" })
    .limit(10);

  if (!ftsErr && ftsData && ftsData.length > 0) {
    return NextResponse.json({ results: ftsData });
  }

  // fallback: ilike على الاسم (لو search_vector لم يُملأ بعد)
  // يستخدم sanitize-filter لمنع PostgREST filter injection
  const clause = buildIlikeOrClause(["name", "title_en", "title_ar"], q);
  if (!clause) {
    return NextResponse.json({ results: [] });
  }
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, title_en, title_ar, price_egp, image_url, images",
    )
    .eq("is_active", true)
    .or(clause)
    .limit(10);

  if (error) {
    console.error("/api/products/search error", error);
    return NextResponse.json(
      { error: { en: "Search error", ar: "خطأ في البحث" } },
      { status: 500 },
    );
  }

  return NextResponse.json({ results: data ?? [] });
}
