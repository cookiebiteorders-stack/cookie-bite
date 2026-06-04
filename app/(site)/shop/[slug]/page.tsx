import type { Metadata } from "next";
import { ProductPdpPageClient } from "@/components/shop/product-pdp-page-client";
import { buildProductMetadata } from "@/lib/seo";
import { fetchPdpPayloadFromApi } from "@/lib/storefront/pdp-api";

type Props = { params: Promise<{ slug: string }> };

/**
 * صفحة ديناميكية لكل منتج نشط — أي slug جديد من لوحة التحكم يعمل فوراً بدون إعادة بناء.
 * المحتوى يُحمَّل عبر /api/products/[slug] من بيانات Supabase.
 */
export const dynamic = "force-dynamic";
export const dynamicParams = true;

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
