import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ShopLoadingFallback } from "@/components/i18n/suspense-loading";
import { ShopClient } from "@/components/shop/shop-client";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import { getTrendingRecommendations } from "@/lib/recommendations/fetch-recommendations";
import { buildPageMetadata, buildShopCategoryMetadata } from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}): Promise<Metadata> {
  const { cat } = await searchParams;
  if (cat?.trim()) {
    return buildShopCategoryMetadata(cat.trim());
  }
  return buildPageMetadata({
    title: "Shop Cookies in New Cairo",
    description:
      "Browse Cookie Bite flavors, compare prices, and order fresh handcrafted cookies online in New Cairo.",
    path: "/shop",
    keywords: [
      "shop cookies cairo",
      "buy cookies online egypt",
      "new cairo bakery shop",
      "cookie bite flavors",
    ],
  });
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
