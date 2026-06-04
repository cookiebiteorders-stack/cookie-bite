import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PdpMediaGallery } from "@/components/shop/pdp-media-gallery";
import { PdpActions } from "@/components/shop/pdp-actions";
import { ProductCard } from "@/components/product/product-card";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ShareButtons } from "@/components/seo/share-buttons";
import { PdpViewTracker } from "@/components/shop/pdp-view-tracker";
import { getCartBasedRecommendations } from "@/lib/recommendations/fetch-recommendations";
import { getActivePdpProduct, listAllActiveSlugs } from "@/lib/storefront/pdp-data";
import { listLinkedAddonsForProduct } from "@/lib/db/addons";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
  buildProductMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { getServerT } from "@/lib/i18n/server-translate";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await listAllActiveSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const lang = await getLangFromCookies();
  const product = await getActivePdpProduct(slug, lang);
  if (!product) return { title: "Product | Cookie Bite" };
  return buildProductMetadata(product, slug);
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const lang = await getLangFromCookies();
  const t = getServerT(lang);
  const product = await getActivePdpProduct(slug, lang);
  if (!product) notFound();

  const carousel = await getCartBasedRecommendations(
    product.productUuid ? [product.productUuid] : [],
    product.id,
    3,
  );
  const linkedAddons = product.productUuid
    ? await listLinkedAddonsForProduct(product.productUuid)
    : [];

  const productJsonLd = buildProductJsonLd(product, slug);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: product.name, path: `/shop/${slug}` },
  ]);

  return (
    <div className="bg-cb-cream pb-20 pt-8">
      {product.productUuid ? (
        <PdpViewTracker productUuid={product.productUuid} />
      ) : null}
      <div className="mx-auto max-w-7xl cb-gutter">
        <JsonLdScript id={`pdp-product-jsonld-${product.id}`} json={productJsonLd} />
        <JsonLdScript id={`pdp-breadcrumb-jsonld-${product.id}`} json={breadcrumbJsonLd} />
        <Link
          href="/shop"
          className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-cb-terracotta-dark hover:underline"
        >
          {lang === "ar" ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
          {t("product.backToShop")}
        </Link>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <PdpMediaGallery
            productId={product.id}
            productName={product.name}
            images={product.images ?? [product.image]}
            videoUrl={product.videoUrl}
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
            <div className="mt-6">
              <ProductPriceDisplay
                price={product.price}
                comparePrice={product.comparePrice}
                size="lg"
              />
            </div>
            {product.stock != null && product.stock <= 0 ? (
              <p
                role="status"
                className="mt-3 inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white"
              >
                {t("product.outOfStock")}
              </p>
            ) : product.stock != null && product.stock <= 10 ? (
              <p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                {t("product.stockLeft", { count: product.stock })}
              </p>
            ) : null}

            <div className="mt-8">
              {linkedAddons.length > 0 ? (
                <a
                  href="#pdp-addons"
                  className={buttonClassName("outline", "mb-3 inline-flex rounded-full px-5 py-2 text-sm")}
                >
                  {t("product.viewAddons")}
                </a>
              ) : null}
              <PdpActions product={product} linkedAddons={linkedAddons} />
            </div>
            <div className="mt-4">
              <ShareButtons title={`${product.name} | Cookie Bite`} />
            </div>

            <div className="mt-10 space-y-4 rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                {t("product.pdpDetails")}
              </h2>
              <ul className="space-y-2 text-sm text-cb-text">
                <li>
                  <strong className="text-cb-text-strong">{t("product.pdpIngredients")}</strong>{" "}
                  {t("product.pdpIngredientsBody")}
                </li>
                <li>
                  <strong className="text-cb-text-strong">{t("product.pdpStorage")}</strong>{" "}
                  {t("product.pdpStorageBody")}
                </li>
                <li>
                  <strong className="text-cb-text-strong">{t("product.pdpDelivery")}</strong>{" "}
                  {t("product.pdpDeliveryBody")}{" "}
                  <Link href="/delivery/new-cairo" className="font-bold text-cb-terracotta-dark underline">
                    {t("product.pdpDeliveryLink")}
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
              {t("product.youMightAlsoLove")}
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
            {t("product.viewAllCookies")}
          </Link>
        </div>
      </div>
    </div>
  );
}
