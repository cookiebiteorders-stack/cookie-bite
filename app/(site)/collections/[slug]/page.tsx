import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { SeoRelatedLinks } from "@/components/seo/seo-related-links";
import { buttonClassName } from "@/components/ui/button";
import {
  getCollectionBreadcrumbLabel,
  getCollectionPageContent,
} from "@/lib/content/collections-seo";
import { translations } from "@/lib/i18n/translations";
import {
  buildBreadcrumbJsonLd,
  buildCollectionMetadata,
  buildFaqPageJsonLd,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { isValidCollectionSlug, listProductsForCollection } from "@/lib/storefront/collection-products";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidCollectionSlug(slug)) return { title: "Collection | Cookie Bite" };
  const lang = await getLangFromCookies();
  return buildCollectionMetadata(slug, lang);
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidCollectionSlug(slug)) notFound();

  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const content = getCollectionPageContent(slug, lang);
  const products = await listProductsForCollection(slug, lang);

  const faqJsonLd = buildFaqPageJsonLd(content.faqs);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: (dict.nav as { shop: string }).shop, path: "/shop" },
    { name: getCollectionBreadcrumbLabel(slug, lang), path: `/collections/${slug}` },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id={`collection-${slug}-faq`} json={faqJsonLd} />
      <JsonLdScript id={`collection-${slug}-breadcrumb`} json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-7xl cb-gutter">
        <header className="mx-auto mb-8 max-w-3xl space-y-4 md:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cb-terracotta-dark">
            {content.eyebrow}
          </p>
          <h1 className="font-serif text-[clamp(1.75rem,2.2vw+1rem,2.5rem)] font-semibold leading-tight text-cb-text-strong">
            {content.pageTitle}
          </h1>
          <p className="max-w-2xl text-cb-text-muted sm:text-lg">{content.subtitle}</p>
        </header>
        <p className="mt-2 max-w-2xl text-cb-text">{content.intro}</p>

        <SeoRelatedLinks
          className="mt-6"
          ariaLabel={content.relatedLinksAria}
          links={content.relatedLinks}
        />

        {products.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-cb-text-muted">
            {content.emptyHint}{" "}
            <Link href="/shop" className="font-bold text-cb-terracotta-dark underline">
              {lang === "ar" ? "المتجر" : "shop"}
            </Link>
            .
          </p>
        )}

        <section className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{content.faqHeading}</h2>
          <ul className="mt-6 space-y-4">
            {content.faqs.map((item) => (
              <li key={item.q} className="rounded-2xl border border-cb-border bg-cb-surface p-5">
                <h3 className="font-semibold text-cb-text-strong">{item.q}</h3>
                <p className="mt-2 text-sm text-cb-text">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/shop" className={buttonClassName("primary", "rounded-full px-8")}>
            {content.shopAllLabel}
          </Link>
          {slug === "gifts" ? (
            <>
              <Link href="/gift-box" className={buttonClassName("outline", "rounded-full px-8")}>
                {content.giftBoxesLabel}
              </Link>
              <Link href="/gift-box/build" className={buttonClassName("outline", "rounded-full px-8")}>
                {content.buildBoxLabel}
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
