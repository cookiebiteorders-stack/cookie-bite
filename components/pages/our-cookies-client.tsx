"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cookie, Heart, Leaf, Sparkles, Star } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { SeoRelatedLinks } from "@/components/seo/seo-related-links";
import { ProductCard } from "@/components/product/product-card";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import {
  getOurCookiesCollectionLinks,
  getOurCookiesRelatedLinks,
} from "@/lib/content/our-cookies-seo";
import { fetchJson } from "@/lib/http/fetch-json";
import type { Product } from "@/lib/data";
import type { OurCookieSectionIcon } from "@/lib/data";
import { buildOurCookiesSections } from "@/lib/storefront/our-cookies-sections";
import {
  fetchAllShopProducts,
  mapApiProductToCatalog,
} from "@/lib/storefront/shop-catalog-client";

const iconMap = {
  cookie: Cookie,
  heart: Heart,
  sparkles: Sparkles,
  star: Star,
  leaf: Leaf,
} as const satisfies Record<OurCookieSectionIcon, typeof Cookie>;

function sectionTitleKey(sectionId: string) {
  return `pages.ourCookies.sections.${sectionId}.title` as const;
}

function sectionDescriptionKey(sectionId: string) {
  return `pages.ourCookies.sections.${sectionId}.description` as const;
}

export function OurCookiesClient() {
  const { t, lang } = useLanguage();
  const { isLoaded, isSignedIn } = useAuth();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [wishlistUuids, setWishlistUuids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchAllShopProducts();
        if (!active) return;
        setCatalog(
          rows.map((row) => mapApiProductToCatalog(row, t("product.fallbackDescription"), lang)),
        );
      } catch (e) {
        if (!active) return;
        const message =
          e instanceof TypeError && /failed to fetch/i.test(e.message)
            ? t("pages.shop.errorNetwork")
            : e instanceof Error
              ? e.message
              : t("pages.shop.errorLoad");
        setError(message);
        setCatalog([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t, lang]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      queueMicrotask(() => setWishlistUuids(new Set()));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchJson<{ items?: { product?: { id?: string } }[] }>(
          "/api/wishlist",
          { cache: "no-store" },
        );
        if (cancelled) return;
        const s = new Set<string>();
        for (const it of data.items ?? []) {
          const id = it.product?.id;
          if (id) s.add(id);
        }
        setWishlistUuids(s);
      } catch {
        if (!cancelled) setWishlistUuids(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  const onWishlistToggled = useCallback((productUuid: string, nowSaved: boolean) => {
    setWishlistUuids((prev) => {
      const next = new Set(prev);
      if (nowSaved) next.add(productUuid);
      else next.delete(productUuid);
      return next;
    });
  }, []);

  const sections = useMemo(() => buildOurCookiesSections(catalog), [catalog]);

  const resolveSectionTitle = (sectionId: string, shopCategory: string) => {
    const key = sectionTitleKey(sectionId);
    const translated = t(key);
    return translated === key ? shopCategory : translated;
  };

  const resolveSectionDescription = (sectionId: string, shopCategory: string) => {
    const key = sectionDescriptionKey(sectionId);
    const translated = t(key);
    return translated === key
      ? t("pages.ourCookies.dynamicDescription", { category: shopCategory })
      : translated;
  };

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-7xl cb-gutter">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cb-terracotta-dark">
            {t("pages.ourCookies.eyebrow")}
          </p>
          <h1 className="font-serif text-[clamp(1.75rem,2.2vw+1rem,2.5rem)] font-semibold text-cb-text-strong">
            {t("pages.ourCookies.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-cb-text-muted sm:text-lg">
            {t("pages.ourCookies.subtitle")}
          </p>
        </header>

        <SeoRelatedLinks
          className="mb-8 flex justify-center"
          ariaLabel={t("pages.ourCookies.collectionsNavAria")}
          links={getOurCookiesCollectionLinks(lang)}
        />

        <p className="mb-8 text-center text-sm text-cb-text-muted">
          {loading
            ? t("pages.ourCookies.loading")
            : t("pages.ourCookies.productCount", { count: catalog.length })}
        </p>

        {error ? (
          <p className="mb-8 text-center text-sm font-medium text-red-600">{error}</p>
        ) : null}

        {!loading && sections.length > 0 ? (
          <nav
            className="-mx-1 mb-12 rounded-2xl border border-cb-peach-deep/50 bg-cb-surface/95 px-2 py-3 shadow-sm backdrop-blur-md dark:border-cb-border/60 dark:bg-cb-surface-elevated/95"
            aria-label={t("pages.ourCookies.collectionsNavAria")}
          >
            <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cb-peach-deep/50">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={cn(
                    "shrink-0 snap-start rounded-full border border-cb-border bg-cb-cream px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-cb-text-strong",
                    "transition hover:border-cb-border-strong hover:bg-cb-peach/70 dark:bg-cb-surface-2 dark:hover:bg-cb-peach-deep/40",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cb-surface",
                  )}
                >
                  {resolveSectionTitle(section.id, section.shopCategory)}
                </a>
              ))}
            </div>
          </nav>
        ) : null}

        {loading ? (
          <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cb-pl-skeleton aspect-[3/4] w-full" />
            ))}
          </div>
        ) : null}

        {!loading && sections.length === 0 && !error ? (
          <div className="cb-pl-empty">
            <h3>{t("pages.ourCookies.noProductsTitle")}</h3>
            <p className="mt-2">{t("pages.ourCookies.noProductsHint")}</p>
            <Link href="/shop" className={buttonClassName("primary", "mt-6")}>
              {t("pages.ourCookies.shopAll")}
            </Link>
          </div>
        ) : null}

        <div className="space-y-16 md:space-y-20">
          {!loading
            ? sections.map((section) => {
                const Icon = iconMap[section.icon];
                const shopHref = `/shop?cat=${encodeURIComponent(section.shopCategory)}`;
                const sectionTitle = resolveSectionTitle(section.id, section.shopCategory);
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-36 md:scroll-mt-40"
                  >
                    <div
                      className={cn(
                        "flex flex-col gap-5 rounded-2xl border border-cb-peach-deep/60 bg-cb-surface p-5 shadow-sm ring-1 ring-cb-border/40",
                        "sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6",
                        "dark:border-cb-border dark:bg-cb-surface-elevated",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <span
                          className={cn(
                            "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                            "bg-cb-peach text-cb-terracotta-dark ring-1 ring-cb-peach-deep",
                            "dark:bg-cb-peach-deep/50 dark:text-cb-terracotta dark:ring-cb-border",
                          )}
                        >
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <div className="min-w-0 space-y-2">
                          <h2 className="font-serif text-2xl font-semibold text-cb-text-strong sm:text-3xl">
                            {sectionTitle}
                          </h2>
                          <p className="max-w-2xl text-sm leading-relaxed text-cb-text sm:text-base">
                            {resolveSectionDescription(section.id, section.shopCategory)}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={shopHref}
                        className={buttonClassName(
                          "outline",
                          "shrink-0 self-start sm:self-center inline-flex w-full justify-center px-6 sm:w-auto",
                        )}
                      >
                        {t("pages.ourCookies.shopVerb")} {sectionTitle}
                      </Link>
                    </div>

                    <div className="relative mt-6">
                      <div
                        className={cn(
                          "flex gap-4 overflow-x-auto overscroll-x-contain pb-3 pt-1",
                          "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:thin]",
                          "[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cb-peach-deep/45",
                        )}
                      >
                        {section.items.map((item) => (
                          <div
                            key={item.id}
                            className="w-[min(18rem,calc(100vw-3rem))] shrink-0 snap-start sm:w-72"
                          >
                            <ProductCard
                              product={item}
                              className="h-full"
                              wishlisted={
                                item.productUuid ? wishlistUuids.has(item.productUuid) : false
                              }
                              onWishlistToggled={onWishlistToggled}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })
            : null}
        </div>

        {!loading && catalog.length > 0 ? (
          <div className="mt-14 text-center">
            <Link href="/shop" className={buttonClassName("primary", "px-8")}>
              {t("pages.ourCookies.shopAll")}
            </Link>
          </div>
        ) : null}

        <section className="mt-16 border-t border-cb-border pt-10">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong sm:text-2xl">
            {t("pages.ourCookies.seoSectionTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cb-text sm:text-base">
            {t("pages.ourCookies.seoSectionBody")}
          </p>
          <SeoRelatedLinks
            className="mt-5"
            ariaLabel={t("pages.ourCookies.seoRelatedAria")}
            links={getOurCookiesRelatedLinks(lang)}
          />
        </section>
      </div>
    </div>
  );
}
