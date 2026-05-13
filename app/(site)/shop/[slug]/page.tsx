import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PdpSharedHero } from "@/components/shop/pdp-shared-hero";
import { PdpActions } from "@/components/shop/pdp-actions";
import { ProductCard } from "@/components/product/product-card";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ShareButtons } from "@/components/seo/share-buttons";
import {
  getActivePdpProduct,
  getRelatedStorefrontProducts,
  listAllActiveSlugs,
} from "@/lib/storefront/pdp-data";

type Props = { params: Promise<{ slug: string }> };
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const slugs = await listAllActiveSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActivePdpProduct(slug);
  if (!product) return { title: "Product | Cookie Bite" };
  return {
    title: `${product.name} Cookies in New Cairo`,
    description: `${product.description} Order ${product.name} online from Cookie Bite with premium ingredients and fast support in New Cairo.`,
    keywords: [
      `${product.name.toLowerCase()} cookie`,
      "new cairo cookies",
      "cookie delivery egypt",
      "cookie bite product",
    ],
    alternates: { canonical: `/shop/${slug}` },
    openGraph: {
      url: `${APP_URL}/shop/${slug}`,
      title: `${product.name} | Cookie Bite`,
      description: `${product.description} Shop this Cookie Bite favorite in New Cairo.`,
      images: [{ url: product.image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Cookie Bite`,
      description: `${product.description} Order now from Cookie Bite.`,
      images: [product.image],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getActivePdpProduct(slug);
  if (!product) notFound();

  const carousel = await getRelatedStorefrontProducts(
    product.category,
    product.id,
    3,
  );

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.image],
    description: product.description,
    sku: product.productUuid ?? product.id,
    brand: { "@type": "Brand", name: "Cookie Bite" },
    offers: {
      "@type": "Offer",
      url: `${APP_URL}/shop/${product.id}`,
      priceCurrency: "EGP",
      price: String(product.price),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stock != null && product.stock <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  };

  return (
    <div className="bg-cb-cream pb-20 pt-8">
      <div className="mx-auto max-w-7xl cb-gutter">
        <JsonLdScript id={`pdp-product-jsonld-${product.id}`} json={JSON.stringify(productJsonLd)} />
        <Link
          href="/shop"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-cb-terracotta-dark hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Back to shop
        </Link>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <PdpSharedHero
            productId={product.id}
            src={product.image}
            alt={product.name}
            sizes="(max-width:1024px) 100vw, 50vw"
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cb-terracotta-dark">
              {product.category}
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-lg text-cb-text">{product.description}</p>
            <p className="mt-6 font-serif text-3xl font-bold text-cb-terracotta-dark">
              {product.price} EGP
            </p>
            {product.stock != null && product.stock <= 10 ? (
              <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                {product.stock === 0
                  ? "Currently out of stock online — contact us on WhatsApp."
                  : `Only ${product.stock} left in stock.`}
              </p>
            ) : null}

            <div className="mt-8">
              <PdpActions product={product} />
            </div>
            <div className="mt-4">
              <ShareButtons title={`${product.name} | Cookie Bite`} />
            </div>

            <div className="mt-10 space-y-4 rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                Details
              </h2>
              <ul className="space-y-2 text-sm text-cb-text">
                <li>
                  <strong className="text-cb-text-strong">Ingredients:</strong> premium
                  flour, butter, natural flavors — full list on packaging.
                </li>
                <li>
                  <strong className="text-cb-text-strong">Storage:</strong> airtight
                  container · enjoy within a few days for best texture.
                </li>
                <li>
                  <strong className="text-cb-text-strong">Delivery:</strong> New Cairo &
                  surrounding areas — see{" "}
                  <Link href="/help/faq" className="font-bold text-cb-terracotta-dark underline">
                    FAQ
                  </Link>
                  .
                </li>
              </ul>
            </div>
          </div>
        </div>

        {carousel.length > 0 ? (
          <section className="mt-20">
            <h2 className="font-serif text-2xl font-semibold text-cb-text-strong">
              You might also love
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {carousel.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12 text-center">
          <Link href="/shop" className={buttonClassName("outline", "inline-flex rounded-full px-8")}>
            View all cookies
          </Link>
        </div>
      </div>
    </div>
  );
}
