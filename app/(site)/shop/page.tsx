import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ShopLoadingFallback } from "@/components/i18n/suspense-loading";
import { ShopClient } from "@/components/shop/shop-client";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import { getTrendingRecommendations } from "@/lib/recommendations/fetch-recommendations";
import { buildLocalizedPageMetadata, buildShopCategoryMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}): Promise<Metadata> {
  const cookieStore = await cookies();
  const { cat } = await searchParams;
  const lang = cookieStore.get(LANG_COOKIE)?.value === "ar" ? "ar" : "en";
  if (cat?.trim()) {
    return buildShopCategoryMetadata(cat.trim());
  }
  return buildLocalizedPageMetadata("/shop", lang);
}

export default async function ShopPage() {
  const cookieStore = await cookies();
  const lang = cookieStore.get(LANG_COOKIE)?.value === "ar" ? "ar" : "en";
  const trending = await getTrendingRecommendations(8, lang);

  return (
    <Suspense fallback={<ShopLoadingFallback />}>
      <ShopClient initialTrending={trending} />
    </Suspense>
  );
}
