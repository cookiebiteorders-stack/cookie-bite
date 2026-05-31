import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopLoadingFallback } from "@/components/i18n/suspense-loading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ShopClient } from "@/components/shop/shop-client";
import { getShopPageFaq } from "@/lib/content/shop-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
  buildShopCategoryMetadata,
  getLangFromCookies,
} from "@/lib/seo";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}): Promise<Metadata> {
  const lang = await getLangFromCookies();
  const { cat } = await searchParams;
  if (cat?.trim()) {
    return buildShopCategoryMetadata(cat.trim());
  }
  return buildLocalizedPageMetadata("/shop", lang);
}

export default async function ShopPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const faqJsonLd = buildFaqPageJsonLd(getShopPageFaq(lang));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.nav as { shop: string }).shop, path: "/shop" },
  ]);

  const { getTrendingRecommendations } = await import("@/lib/recommendations/fetch-recommendations");
  const trending = await getTrendingRecommendations(8, lang);

  return (
    <>
      <JsonLdScript id="shop-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <JsonLdScript id="shop-faq-jsonld" json={faqJsonLd} />
      <Suspense fallback={<ShopLoadingFallback />}>
        <ShopClient initialTrending={trending} />
      </Suspense>
    </>
  );
}
