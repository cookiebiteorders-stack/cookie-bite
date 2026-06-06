import { NextRequest, NextResponse } from "next/server";
import { listLinkedAddonsForProduct } from "@/lib/db/addons";
import {
  getApprovedProductReviews,
  getFbtStorefrontProducts,
  getRelatedStorefrontProducts,
} from "@/lib/storefront/pdp-data";
import { getActiveProductRowByRouteKey } from "@/lib/storefront/resolve-active-product";
import type { Lang } from "@/lib/i18n/translations";
import { buildRatingDistribution } from "@/lib/storefront/review-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!slug || slug.length < 1) {
    return NextResponse.json(
      { error: { en: "Missing slug", ar: "الرمز مفقود" } },
      { status: 400 },
    );
  }

  const data = await getActiveProductRowByRouteKey(slug);
  if (!data) {
    return NextResponse.json(
      { error: { en: "Product not found", ar: "المنتج غير موجود" } },
      { status: 404 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const canonicalSlug = data.slug;
  const { data: reviewsAgg } = await supabase
    .from("reviews")
    .select("rating", { count: "exact" })
    .eq("product_id", data.id)
    .eq("is_approved", true);

  const ratings = (reviewsAgg ?? []).map((r) => r.rating);
  const rating_distribution = buildRatingDistribution(ratings);
  const avg_rating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : null;

  const lang: Lang = req.nextUrl.searchParams.get("lang") === "ar" ? "ar" : "en";
  const wantAddons = req.nextUrl.searchParams.get("addons") === "1";
  const wantRelated = req.nextUrl.searchParams.get("related") === "1";
  const wantFbt = req.nextUrl.searchParams.get("fbt") === "1";
  const wantReviews = req.nextUrl.searchParams.get("reviews") === "1";

  const [addons, related, fbt, reviews] = await Promise.all([
    wantAddons ? listLinkedAddonsForProduct(data.id) : Promise.resolve([]),
    wantRelated
      ? getRelatedStorefrontProducts(
          (data.category as string | null) ?? null,
          canonicalSlug,
          3,
          lang,
        )
      : Promise.resolve([]),
    wantFbt ? getFbtStorefrontProducts(data, lang) : Promise.resolve([]),
    wantReviews ? getApprovedProductReviews(data.id) : Promise.resolve([]),
  ]);

  return NextResponse.json(
    {
      product: data,
      addons,
      related,
      fbt,
      reviews,
      review_count: ratings.length,
      avg_rating,
      rating_distribution,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
