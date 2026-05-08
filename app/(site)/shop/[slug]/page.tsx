import type { Metadata } from "next";
import { PRODUCTS } from "@/src/data/products";
import { ProductDetailPageClient } from "@/src/pages/ProductDetailPage";

type Props = { params: Promise<{ slug: string }> };
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.id === slug);
  if (!product) return { title: "Product" };
  return {
    title: `${product.name} Product Details`,
    description: `${product.description} Explore product details, reviews, and add to cart.`,
    keywords: [
      `${product.name.toLowerCase()}`,
      "product details",
      "shop online",
    ],
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      url: `${APP_URL}/shop/${slug}`,
      title: `${product.name} | Cookie Bite`,
      description: `${product.description} Shop this product now.`,
      images: [{ url: product.images[0], width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Cookie Bite`,
      description: `${product.description} Order now.`,
      images: [product.images[0]],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = PRODUCTS.find((p) => p.id === slug);
  const productJsonLd = product
    ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.images[0]],
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      url: `${APP_URL}/shop/${product.id}`,
      priceCurrency: "USD",
      price: String(product.price),
      itemCondition: "https://schema.org/NewCondition",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
      }
    : null;

  return (
    <>
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      ) : null}
      <ProductDetailPageClient slug={slug} />
    </>
  );
}
