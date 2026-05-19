import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ShopLoadingFallback } from "@/components/i18n/suspense-loading";
import { ShopClient } from "@/components/shop/shop-client";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import { getTrendingRecommendations } from "@/lib/recommendations/fetch-recommendations";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const metadata: Metadata = {
  title: "Shop Cookies in New Cairo",
  description:
    "Browse Cookie Bite flavors, compare prices, and order fresh handcrafted cookies online in New Cairo.",
  keywords: [
    "shop cookies cairo",
    "buy cookies online egypt",
    "new cairo bakery shop",
    "cookie bite flavors",
  ],
  alternates: { canonical: "/shop" },
  openGraph: {
    url: `${APP_URL}/shop`,
    title: "Shop Cookies in New Cairo | Cookie Bite",
    description:
      "Browse handcrafted cookies and order your favorite flavors online.",
    images: [{ url: `${APP_URL}/images/web-logo.png`, width: 1200, height: 630 }],
  },
};

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
