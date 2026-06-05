import { NextResponse } from "next/server";
import { getInstagramFeedItems } from "@/lib/instagram/feed";
import { getLangFromCookies } from "@/lib/seo/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
} as const;

export async function GET() {
  const lang = await getLangFromCookies();
  const items = await getInstagramFeedItems(lang);
  return NextResponse.json({ items }, { headers: CACHE_HEADERS });
}
