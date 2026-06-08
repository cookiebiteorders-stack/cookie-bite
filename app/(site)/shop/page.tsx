import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ShopLoadingFallback } from "@/components/i18n/suspense-loading";
import { JsonLdScript } from "@/components/seo/json-ld-script";

const ShopClient = dynamic(
  () => import("@/components/shop/shop-client").then((m) => ({ default: m.ShopClient })),
  { loading: () => <ShopLoadingFallback /> },
);
import { getShopPageFaq } from "@/lib/content/shop-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
  buildShopCategoryMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { getCachedTrendingRecommendations } from "@/lib/storefront/cached-catalog";
import { getCachedShopCategoryLabels } from "@/lib/storefront/shop-categories-server";
import { getCachedShopCatalog } from "@/lib/storefront/shop-catalog-server";

/** ISR: كتالوج المتجر يُحدَّث كل دقيقتين؛ الكاش الداخلي للترند 120s. */
export const revalidate = 120;

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

  const [trending, initialCatalog, categoryLabels] = await Promise.all([
    getCachedTrendingRecommendations(8, lang),
    getCachedShopCatalog(),
    getCachedShopCategoryLabels(),
  ]);

  return (
    <>
      <JsonLdScript id="shop-breadcrumb-jsonld" json={breadcrumbJsonLd} />
      <JsonLdScript id="shop-faq-jsonld" json={faqJsonLd} />
      <ShopClient
        initialTrending={trending}
        initialCatalog={initialCatalog}
        categoryLabels={categoryLabels}
      />
    </>
  );
}
