import type { Metadata } from "next";
import { ProductPdpPageClient } from "@/components/shop/product-pdp-page-client";
import { buildProductMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { fetchPdpPayloadFromApi } from "@/lib/storefront/pdp-api";

type Props = { params: Promise<{ slug: string }> };

/** ISR: PDP يُحدَّث كل دقيقة؛ slug جديد يعمل عبر dynamicParams. */
export const revalidate = 60;
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const lang = await getLangFromCookies();
    const payload = await fetchPdpPayloadFromApi(slug, lang);
    if (payload?.product) return buildProductMetadata(payload.product, slug);
  } catch (e) {
    console.error("[pdp] generateMetadata", e);
  }
  return { title: "Product | Cookie Bite" };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const lang = await getLangFromCookies();
  const initialPayload = await fetchPdpPayloadFromApi(slug, lang);

  return <ProductPdpPageClient slug={slug} initialPayload={initialPayload} />;
}
