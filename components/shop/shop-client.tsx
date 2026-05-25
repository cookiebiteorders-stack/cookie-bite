"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { fetchJson } from "@/lib/http/fetch-json";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/data";

type SortMode = "newest" | "price_asc" | "price_desc" | "popular";
type BadgeFilter = "bestseller" | "new" | "trending";

function isSortMode(v: string | null): v is SortMode {
  return v === "newest" || v === "price_asc" || v === "price_desc" || v === "popular";
}

function isBadgeFilter(v: string): v is BadgeFilter {
  return v === "bestseller" || v === "new" || v === "trending";
}

type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  title_en: string | null;
  title_ar: string | null;
  description: string | null;
  description_en: string | null;
  description_ar: string | null;
  price_egp: number;
  compare_price_egp?: number | null;
  image_url: string | null;
  images: Array<{ url?: string | null }> | null;
  badges: string[] | null;
  category: string | null;
  is_active: boolean;
  stock: number;
  created_at: string;
};

type ShopProduct = Product & {
  inStock: boolean;
  createdAt: string;
};

function normalizeProduct(
  p: ApiProduct,
  descFallback: string,
  lang: "ar" | "en",
): ShopProduct {
  const slug = p.slug?.trim() || "";
  const title =
    lang === "ar"
      ? p.title_ar || p.title_en || p.name
      : p.title_en || p.title_ar || p.name;
  const description =
    lang === "ar"
      ? p.description_ar || p.description_en || p.description || descFallback
      : p.description_en || p.description_ar || p.description || descFallback;
  const mainImage =
    p.images?.find((img) => typeof img?.url === "string" && img.url)?.url ||
    p.image_url ||
    "/images/web-logo.png";
  const normalizedBadges = (p.badges ?? []).filter(isBadgeFilter);

  return {
    id: slug || p.id,
    productUuid: p.id,
    name: title,
    description,
    price: p.price_egp,
    comparePrice:
      p.compare_price_egp != null && Number.isFinite(Number(p.compare_price_egp))
        ? Number(p.compare_price_egp)
        : null,
    image: mainImage,
    category: p.category || "Classic",
    badges: normalizedBadges.length ? normalizedBadges : undefined,
    inStock: p.stock > 0,
    createdAt: p.created_at,
  };
}

async function fetchAllProducts(): Promise<ApiProduct[]> {
  const limit = 48;
  let page = 1;
  let totalPages = 1;
  const all: ApiProduct[] = [];

  while (page <= totalPages) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort: "newest",
    });
    const payload = await fetchJson<{
      products?: ApiProduct[];
      total_pages?: number;
    }>(`/api/products?${params.toString()}`, {
      cache: "no-store",
      timeoutMs: 12000,
      retries: 1,
      retryDelayMs: 350,
    });
    all.push(...(payload.products ?? []));
    totalPages = Math.max(1, Number(payload.total_pages ?? 1));
    page += 1;
  }

  return all;
}

type ShopClientProps = {
  /** من الخادم — محرك التوصيات أو fallback */
  initialTrending?: Product[];
};

export function ShopClient({ initialTrending = [] }: ShopClientProps) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [catalog, setCatalog] = useState<ShopProduct[]>([]);
  const [wishlistUuids, setWishlistUuids] = useState<Set<string>>(new Set());
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cat, setCat] = useState<string>(() => {
    const raw = searchParams.get("cat");
    return raw && raw.trim() ? raw : "All";
  });
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [sort, setSort] = useState<SortMode>(() => {
    const raw = searchParams.get("sort");
    return isSortMode(raw) ? raw : "newest";
  });
  const [onlyBest, setOnlyBest] = useState(() => searchParams.get("best") === "1");
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get("stock") === "1");
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter | "all">(() => {
    const raw = searchParams.get("badge");
    return raw && isBadgeFilter(raw) ? raw : "all";
  });
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

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

  useEffect(() => {
    const openFilters = () => {
      filterAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const first = filterAnchorRef.current?.querySelector<HTMLElement>(
        "input[type=\"search\"], input:not([type]), select",
      );
      first?.focus();
    };
    window.addEventListener("cookiebite:openShopFilters", openFilters);
    return () => window.removeEventListener("cookiebite:openShopFilters", openFilters);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchAllProducts();
        if (!active) return;
        const normalized = rows.map((row) =>
          normalizeProduct(row, t("product.fallbackDescription"), lang),
        );
        setCatalog(normalized);
        const minParam = Number(searchParams.get("min"));
        const maxParam = Number(searchParams.get("max"));
        if (Number.isFinite(minParam)) setMinPrice(minParam);
        if (Number.isFinite(maxParam)) setMaxPrice(maxParam);
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
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, t, lang]);

  const availableCategories = useMemo(
    () =>
      ["All", ...Array.from(new Set(catalog.map((p) => p.category).filter(Boolean)))].filter(
        Boolean,
      ) as string[],
    [catalog],
  );

  const priceBounds = useMemo(() => {
    if (!catalog.length) return { min: 0, max: 0 };
    let min = catalog[0].price;
    let max = catalog[0].price;
    for (const p of catalog) {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }
    return { min, max };
  }, [catalog]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("cat", cat);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "newest") params.set("sort", sort);
    if (onlyBest) params.set("best", "1");
    if (inStockOnly) params.set("stock", "1");
    if (badgeFilter !== "all") params.set("badge", badgeFilter);
    if (minPrice != null && minPrice > priceBounds.min) params.set("min", String(minPrice));
    if (maxPrice != null && maxPrice < priceBounds.max) params.set("max", String(maxPrice));
    router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [
    cat,
    query,
    sort,
    onlyBest,
    inStockOnly,
    badgeFilter,
    minPrice,
    maxPrice,
    priceBounds.min,
    priceBounds.max,
    pathname,
    router,
  ]);

  const filtered = useMemo(() => {
    let list: ShopProduct[] = catalog;
    const q = query.trim().toLowerCase();
    if (cat !== "All") {
      list = list.filter((p) => p.category === cat);
    }
    if (q) {
      list = list.filter((p) => {
        const hay = `${p.name} ${p.description} ${p.category}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (onlyBest) {
      list = list.filter((p) => p.badges?.includes("bestseller"));
    }
    if (badgeFilter !== "all") {
      list = list.filter((p) => p.badges?.includes(badgeFilter));
    }
    if (inStockOnly) {
      list = list.filter((p) => p.inStock);
    }
    if (minPrice != null) {
      list = list.filter((p) => p.price >= minPrice);
    }
    if (maxPrice != null) {
      list = list.filter((p) => p.price <= maxPrice);
    }
    if (sort === "price_asc") {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      list = [...list].sort((a, b) => b.price - a.price);
    } else {
      // newest/popular fallback with existing shape
      list = [...list];
    }
    return list;
  }, [catalog, cat, query, onlyBest, badgeFilter, inStockOnly, minPrice, maxPrice, sort]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cat !== "All") count += 1;
    if (query.trim()) count += 1;
    if (sort !== "newest") count += 1;
    if (onlyBest) count += 1;
    if (inStockOnly) count += 1;
    if (badgeFilter !== "all") count += 1;
    if (minPrice != null && minPrice > priceBounds.min) count += 1;
    if (maxPrice != null && maxPrice < priceBounds.max) count += 1;
    return count;
  }, [cat, query, sort, onlyBest, inStockOnly, badgeFilter, minPrice, maxPrice, priceBounds.min, priceBounds.max]);

  const clearAll = () => {
    setCat("All");
    setQuery("");
    setSort("newest");
    setOnlyBest(false);
    setInStockOnly(false);
    setBadgeFilter("all");
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
  };

  return (
    <div className="bg-[var(--color-cream)] pb-20">
      <header className="cb-pl-shop-header text-center">
        <div className="mx-auto max-w-7xl cb-gutter">
          <p className="cb-pl-eyebrow mb-2">{t("pages.shop.eyebrow")}</p>
          <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] font-bold text-[var(--color-text-primary)]">
            {t("pages.shop.title")}
          </h1>
          <p className="mt-3 text-base text-[var(--color-text-secondary)]">
            {t("pages.shop.subtitle")}
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl cb-gutter pt-10">

        {initialTrending.length > 0 ? (
          <section className="mb-10 border-b border-cb-border/60 pb-10" aria-labelledby="shop-trending-heading">
            <SectionHeading
              align="left"
              className="mb-6 text-start"
              eyebrow={t("pages.shop.trendingEyebrow")}
              title={
                <span id="shop-trending-heading">{t("pages.shop.trendingTitle")}</span>
              }
              subtitle={t("pages.shop.trendingSubtitle")}
              variant="editorial"
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {initialTrending.map((p) => (
                <ProductCard
                  key={`trending-${p.id}`}
                  product={p}
                  layout="compact"
                  wishlisted={p.productUuid ? wishlistUuids.has(p.productUuid) : false}
                  onWishlistToggled={onWishlistToggled}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section
          id="shop-catalog"
          className="scroll-mt-24"
          aria-labelledby="shop-catalog-heading"
        >
          <SectionHeading
            align="left"
            className="mb-5 text-start"
            eyebrow={t("pages.shop.catalogEyebrow")}
            title={<span id="shop-catalog-heading">{t("pages.shop.catalogTitle")}</span>}
            subtitle={t("pages.shop.catalogSubtitle")}
            variant="editorial"
          />

          <div
            ref={filterAnchorRef}
            id="shop-filters"
            className="cb-pl-shop-filters sticky top-16 z-20 mb-6"
          >
            <div className="cb-pl-shop-filters__row--primary">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("pages.shop.searchPlaceholder")}
                className="cb-pl-input min-h-10 rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={sort}
                onChange={(e) => setSort((e.target.value as SortMode) || "newest")}
                className="cb-pl-input min-h-10 rounded-xl px-3 py-2 text-sm"
                aria-label={t("pages.shop.sortPopular")}
              >
                <option value="newest">{t("pages.shop.sortNewest")}</option>
                <option value="popular">{t("pages.shop.sortPopular")}</option>
                <option value="price_asc">{t("pages.shop.sortPriceAsc")}</option>
                <option value="price_desc">{t("pages.shop.sortPriceDesc")}</option>
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={minPrice ?? ""}
                  onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : null)}
                  placeholder={t("pages.shop.minEgp")}
                  className="cb-pl-input min-h-10 w-full rounded-xl px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={maxPrice ?? ""}
                  onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                  placeholder={t("pages.shop.maxEgp")}
                  className="cb-pl-input min-h-10 w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={clearAll}
                className={buttonClassName("outline", "min-h-10 w-full shrink-0 whitespace-nowrap lg:w-auto lg:px-5")}
              >
                {t("pages.shop.resetFilters")}
              </button>
            </div>

            <div
              className={cn(
                "cb-pl-shop-filters__row gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]",
                "sm:flex-wrap sm:overflow-visible",
                "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cb-peach-deep/45",
              )}
            >
              {availableCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "cb-pl-pill shrink-0 snap-start font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-caramel)] focus-visible:ring-offset-2",
                    cat === c && "is-active",
                  )}
                  data-active={cat === c ? "true" : undefined}
                >
                  {c === "All" ? t("pages.shop.categoryAll") : c}
                </button>
              ))}
            </div>

            <div className="cb-pl-shop-filters__divider space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-cb-text-strong">
                  {t("pages.shop.showing", { filtered: filtered.length, total: catalog.length })}
                </p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cb-peach px-2.5 py-1 text-xs font-bold text-cb-text-strong ring-1 ring-cb-border">
                    {t("pages.shop.activeCount", { count: activeFilterCount })}
                  </span>
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="rounded-full px-2.5 py-1 text-xs font-bold text-cb-brand-600 ring-1 ring-cb-border transition hover:bg-cb-peach"
                    >
                      {t("pages.shop.clearAll")}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-cb-text">
                <button
                  type="button"
                  onClick={() => setOnlyBest((v) => !v)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                    onlyBest
                      ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                      : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
                  )}
                >
                  {t("pages.shop.bestSellersOnly")}
                </button>
                <button
                  type="button"
                  onClick={() => setInStockOnly((v) => !v)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                    inStockOnly
                      ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                      : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
                  )}
                >
                  {t("pages.shop.inStockOnly")}
                </button>
                <div className="hidden h-5 w-px bg-cb-border/70 sm:block" aria-hidden />
                {(["all", "bestseller", "new", "trending"] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBadgeFilter(b)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                      badgeFilter === b
                        ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                        : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
                    )}
                  >
                    {b === "all"
                      ? t("pages.shop.allBadges")
                      : b === "bestseller"
                        ? t("product.badgeBestseller")
                        : b === "new"
                          ? t("product.badgeNew")
                          : t("product.badgeTrending")}
                  </button>
                ))}
              </div>
            </div>
          </div>

        {loading ? (
          <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cb-pl-skeleton aspect-[3/4] w-full" />
            ))}
          </div>
        ) : null}
        {error ? <p className="py-4 text-center text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              wishlisted={p.productUuid ? wishlistUuids.has(p.productUuid) : false}
              onWishlistToggled={onWishlistToggled}
            />
          ))}
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="cb-pl-empty">
            <h3>{t("pages.shop.noMatch")}</h3>
            <p className="mt-2">{t("pages.shop.subtitle")}</p>
            <button type="button" onClick={clearAll} className={buttonClassName("primary", "mt-6")}>
              {t("pages.shop.resetFilters")}
            </button>
          </div>
        ) : null}
        </section>

      </div>
    </div>
  );
}
