import type { Metadata } from "next";
import { ProductPdpPageClient } from "@/components/shop/product-pdp-page-client";
import { buildProductMetadata } from "@/lib/seo";
import { fetchPdpPayloadFromApi } from "@/lib/storefront/pdp-api";
import { listAllActiveSlugs } from "@/lib/storefront/pdp-data";

type Props = { params: Promise<{ slug: string }> };

/** تجنّب تعطل RSC على Hostinger — المحتوى يُحمَّل عبر /api/products/[slug] (يعمل على الإنتاج). */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await listAllActiveSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const payload = await fetchPdpPayloadFromApi(slug, "en");
    if (payload?.product) return buildProductMetadata(payload.product, slug);
  } catch (e) {
    console.error("[pdp] generateMetadata", e);
  }
  return { title: "Product | Cookie Bite" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <ProductPdpPageClient slug={slug} />;
}
