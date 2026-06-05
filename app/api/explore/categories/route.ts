import { NextResponse } from "next/server";
import { getExploreCategoryCards } from "@/lib/storefront/explore-category-cards";
import { getLangFromCookies } from "@/lib/seo/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
} as const;

export async function GET() {
  const lang = await getLangFromCookies();
  const cards = await getExploreCategoryCards(lang);
  return NextResponse.json({ cards }, { headers: CACHE_HEADERS });
}
