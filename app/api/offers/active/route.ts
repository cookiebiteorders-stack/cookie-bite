import { NextRequest, NextResponse } from "next/server";
import { loadActiveOffers } from "@/lib/offers/catalog";
import { mapOfferToStorefront } from "@/lib/offers/storefront";
import type { Lang } from "@/lib/i18n/translations";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

export async function GET(req: NextRequest) {
  try {
    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: Lang = langParam === "ar" ? "ar" : "en";
    const offers = await loadActiveOffers();
    return NextResponse.json(
      {
        offers: offers.map((offer) => mapOfferToStorefront(offer, lang)),
      },
      { headers: CACHE_HEADERS },
    );
  } catch (err) {
    console.error("GET /api/offers/active", err);
    return NextResponse.json({ offers: [] }, { status: 500, headers: CACHE_HEADERS });
  }
}
