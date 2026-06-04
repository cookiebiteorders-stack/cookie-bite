"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { PdpMediaGallery } from "@/components/shop/pdp-media-gallery";
import { PdpActions } from "@/components/shop/pdp-actions";
import { ProductCard } from "@/components/product/product-card";
import { ProductPriceDisplay } from "@/components/product/product-price-display";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { ShareButtons } from "@/components/seo/share-buttons";
import { PdpViewTracker } from "@/components/shop/pdp-view-tracker";
import { PdpProductSpecs } from "@/components/shop/pdp-product-specs";
import type { Addon } from "@/lib/addons/types";
import type { Product } from "@/lib/data";
import { fetchJson } from "@/lib/http/fetch-json";
import { useLanguage } from "@/components/providers/language-provider";
import type { ProductRow } from "@/lib/db/types";
import { productRowToStorefrontProduct } from "@/lib/storefront/map-product-row";
import {
  buildBreadcrumbJsonLd,
  buildProductJsonLd,
} from "@/lib/seo";
import type { PdpApiPayload } from "@/lib/storefront/pdp-api";

const FALLBACK_DESC = "Fresh handcrafted treats from Cookie Bite — New Cairo.";

type ApiResponse = {
  product: ProductRow;
  addons?: Addon[];
  related?: Product[];
};

type Props = {
  slug: string;
  initialPayload?: PdpApiPayload | null;
};

export function ProductPdpPageClient({ slug, initialPayload = null }: Props) {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(!initialPayload?.product);
  const [product, setProduct] = useState<Product | null>(initialPayload?.product ?? null);
  const [addons, setAddons] = useState<Addon[]>(initialPayload?.addons ?? []);
  const [related, setRelated] = useState<Product[]>(initialPayload?.related ?? []);

  useEffect(() => {
    if (initialPayload?.product) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await fetchJson<ApiResponse>(
          `/api/products/${encodeURIComponent(slug)}?lang=${lang}&related=1&addons=1`,
          { cache: "no-store" },
        );
        if (cancelled) return;
        if (!data.product?.slug) {
          router.replace("/shop");
          return;
        }
        const canonical = data.product.slug;
        if (canonical !== slug) {
          router.replace(`/shop/${encodeURIComponent(canonical)}`);
          return;
        }
        const mapped = productRowToStorefrontProduct(data.product, FALLBACK_DESC, lang);
        setProduct(mapped);
        setAddons(data.addons ?? []);
        setRelated((data.related ?? []).filter((p) => p.id !== mapped.id));
      } catch {
        if (!cancelled) router.replace("/shop");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lang, router, initialPayload?.product]);

  const jsonLd = useMemo(() => {
    if (!product) return null;
    return {
      product: buildProductJsonLd(product, slug),
      breadcrumb: buildBreadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
        { name: product.name, path: `/shop/${slug}` },
      ]),
    };
  }, [product, slug]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-cb-cream">
        <Loader2 className="h-8 w-8 animate-spin text-cb-terracotta-dark" aria-hidden />
        <span className="sr-only">{t("pages.shop.loadingCookies")}</span>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="bg-cb-cream pb-20 pt-8">
      {product.productUuid ? <PdpViewTracker productUuid={product.productUuid} /> : null}
      <div className="mx-auto max-w-7xl cb-gutter">
        {jsonLd ? (
          <>
            <JsonLdScript id={`pdp-product-jsonld-${product.id}`} json={jsonLd.product} />
            <JsonLdScript id={`pdp-breadcrumb-jsonld-${product.id}`} json={jsonLd.breadcrumb} />
          </>
        ) : null}
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
              {addons.length > 0 ? (
                <a
                  href="#pdp-addons"
                  className={buttonClassName("outline", "mb-3 inline-flex rounded-full px-5 py-2 text-sm")}
                >
                  {t("product.viewAddons")}
                </a>
              ) : null}
              <PdpActions product={product} linkedAddons={addons} />
            </div>
            <div className="mt-4">
              <ShareButtons title={`${product.name} | Cookie Bite`} />
            </div>

            <PdpProductSpecs product={product} />
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-20">
            <h2 className="font-serif text-2xl font-semibold text-cb-text-strong">
              {t("product.youMightAlsoLove")}
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
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
