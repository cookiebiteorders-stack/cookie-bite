"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useCart } from "@/components/providers/cart-provider";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { SeoRelatedLinks } from "@/components/seo/seo-related-links";
import { useLanguage } from "@/components/providers/language-provider";
import { getShopRelatedLinks } from "@/lib/content/shop-seo";
import { fetchJson } from "@/lib/http/fetch-json";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/data";
import type { Addon } from "@/lib/addons/types";
import { mergeAddonsIntoCatalog } from "@/lib/storefront/merge-catalog-addons";
import {
  fetchAllShopProducts,
  mapApiProductToCatalog,
  type CatalogProduct,
  type ShopApiProduct,
} from "@/lib/storefront/shop-catalog-client";
import { ShopFilterChips, type ShopFilterChip } from "@/components/shop/shop-filter-chips";
import { ShopFilterQuizTrigger } from "@/components/shop/shop-filter-quiz";
import { ShopMobileFilterBar } from "@/components/shop/shop-mobile-filter-sheet";

const ShopFilterQuiz = dynamic(
  () => import("@/components/shop/shop-filter-quiz").then((m) => m.ShopFilterQuiz),
  { ssr: false },
);

const ShopMobileFilterSheet = dynamic(
  () =>
    import("@/components/shop/shop-mobile-filter-sheet").then((m) => m.ShopMobileFilterSheet),
  { ssr: false },
);

const ShareWishlistButton = dynamic(
  () => import("@/components/wishlist/share-wishlist-button").then((m) => m.ShareWishlistButton),
  { ssr: false, loading: () => null },
);
import { trackGa4Event } from "@/lib/analytics/ga4";
import { sortByBestMatch } from "@/lib/storefront/best-match-sort";
import { getRecentlyViewed } from "@/lib/storefront/recently-viewed";
import {
  applyShopFilterQuiz,
  type ShopFilterQuizAnswers,
} from "@/lib/storefront/shop-filter-quiz";
import {
  computeShopFacetCounts,
  filterShopProducts,
  type ShopBadgeFilter,
  type ShopFilterParams,
  type ShopSortMode,
} from "@/lib/storefront/shop-filters";

const SHOP_CATALOG_PAGE_SIZE = 16;

type SortMode = ShopSortMode;
type BadgeFilter = ShopBadgeFilter;

type ShopProduct = CatalogProduct;

function isSortMode(v: string | null): v is SortMode {
  return (
    v === "newest" ||
    v === "price_asc" ||
    v === "price_desc" ||
    v === "popular" ||
    v === "best_match"
  );
}

function isBadgeFilter(v: string): v is BadgeFilter {
  return v === "bestseller" || v === "new" || v === "trending";
}

function priceBoundsFromCatalog(catalog: ShopProduct[]) {
  if (!catalog.length) return { min: 0, max: 0 };
  let min = catalog[0].price;
  let max = catalog[0].price;
  for (const p of catalog) {
    if (p.price < min) min = p.price;
    if (p.price > max) max = p.price;
  }
  return { min, max };
}

function isMinPriceFilterActive(
  minPrice: number | null,
  bounds: { min: number; max: number },
): boolean {
  return minPrice != null && Number.isFinite(minPrice) && minPrice > bounds.min;
}

function isMaxPriceFilterActive(
  maxPrice: number | null,
  bounds: { min: number; max: number },
): boolean {
  return maxPrice != null && Number.isFinite(maxPrice) && maxPrice < bounds.max;
}

type ShopClientProps = {
  /** من الخادم — محرك التوصيات أو fallback */
  initialTrending?: Product[];
  /** من الخادم — يتجنّب طلبات `/api/products` المتسلسلة عند أول paint */
  initialCatalog?: ShopApiProduct[];
};

export function ShopClient({ initialTrending = [], initialCatalog }: ShopClientProps) {
  const { t, lang } = useLanguage();
  const { lines } = useCart();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [catalog, setCatalog] = useState<ShopProduct[]>(() => {
    if (!initialCatalog?.length) return [];
    return initialCatalog.map((row) =>
      mapApiProductToCatalog(row, t("product.fallbackDescription"), lang),
    );
  });
  const [wishlistUuids, setWishlistUuids] = useState<Set<string>>(new Set());
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(!initialCatalog?.length);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filterQuizOpen, setFilterQuizOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(SHOP_CATALOG_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const openFilters = () => setMobileFiltersOpen(true);
    window.addEventListener("cookiebite:openShopFilters", openFilters);
    return () => window.removeEventListener("cookiebite:openShopFilters", openFilters);
  }, []);

  useEffect(() => {
    if (!initialCatalog?.length) return;
    const normalized = initialCatalog.map((row) =>
      mapApiProductToCatalog(row, t("product.fallbackDescription"), lang),
    );
    const bounds = priceBoundsFromCatalog(normalized);
    const minParam = Number(searchParams.get("min"));
    const maxParam = Number(searchParams.get("max"));
    if (Number.isFinite(minParam) && minParam > bounds.min && minParam <= bounds.max) {
      setMinPrice(minParam);
    }
    if (Number.isFinite(maxParam) && maxParam < bounds.max && maxParam >= bounds.min) {
      setMaxPrice(maxParam);
    }
  }, [initialCatalog, lang, searchParams, t]);

  useEffect(() => {
    if (initialCatalog?.length) return;
    let active = true;
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const [rows, addonPayload] = await Promise.all([
          fetchAllShopProducts(),
          fetchJson<{ by_product_id?: Record<string, Addon[]> }>(
            "/api/products/linked-addons",
            { cache: "no-store", timeoutMs: 12000 },
          ).catch(() => ({ by_product_id: {} })),
        ]);
        if (!active) return;
        const normalized = mergeAddonsIntoCatalog(
          rows.map((row) =>
            mapApiProductToCatalog(row, t("product.fallbackDescription"), lang),
          ),
          addonPayload.by_product_id ?? {},
        );
        setCatalog(normalized);
        const bounds = priceBoundsFromCatalog(normalized);
        const minParam = Number(searchParams.get("min"));
        const maxParam = Number(searchParams.get("max"));
        if (Number.isFinite(minParam) && minParam > bounds.min && minParam <= bounds.max) {
          setMinPrice(minParam);
        } else {
          setMinPrice(null);
        }
        if (Number.isFinite(maxParam) && maxParam < bounds.max && maxParam >= bounds.min) {
          setMaxPrice(maxParam);
        } else {
          setMaxPrice(null);
        }
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

  const priceBounds = useMemo(() => priceBoundsFromCatalog(catalog), [catalog]);

  useEffect(() => {
    if (!catalog.length) return;
    if (minPrice != null && !isMinPriceFilterActive(minPrice, priceBounds)) {
      setMinPrice(null);
    }
    if (maxPrice != null && !isMaxPriceFilterActive(maxPrice, priceBounds)) {
      setMaxPrice(null);
    }
  }, [catalog.length, priceBounds.min, priceBounds.max, minPrice, maxPrice]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cat !== "All") params.set("cat", cat);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "newest") params.set("sort", sort);
    if (onlyBest) params.set("best", "1");
    if (inStockOnly) params.set("stock", "1");
    if (badgeFilter !== "all") params.set("badge", badgeFilter);
    if (isMinPriceFilterActive(minPrice, priceBounds)) params.set("min", String(minPrice));
    if (isMaxPriceFilterActive(maxPrice, priceBounds)) params.set("max", String(maxPrice));
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

  const filterParams = useMemo(
    (): ShopFilterParams => ({
      cat,
      query,
      sort,
      onlyBest,
      badgeFilter,
      inStockOnly,
      minPrice,
      maxPrice,
      priceBounds,
    }),
    [cat, query, sort, onlyBest, badgeFilter, inStockOnly, minPrice, maxPrice, priceBounds],
  );

  const filtered = useMemo(
    () => filterShopProducts(catalog, filterParams),
    [catalog, filterParams],
  );

  const displayed = useMemo(() => {
    if (sort !== "best_match") return filtered;
    const recent = getRecentlyViewed();
    return sortByBestMatch(filtered, {
      recentSlugs: recent.map((entry) => entry.slug),
      recentProductUuids: recent
        .map((entry) => entry.productUuid)
        .filter((id): id is string => Boolean(id)),
      cartProductUuids: lines
        .map((line) => line.productUuid)
        .filter((id): id is string => Boolean(id)),
      trendingSlugs: initialTrending.map((product) => product.id),
    });
  }, [filtered, sort, lines, initialTrending]);

  useEffect(() => {
    setVisibleCount(SHOP_CATALOG_PAGE_SIZE);
  }, [cat, query, sort, onlyBest, inStockOnly, badgeFilter, minPrice, maxPrice, catalog.length]);

  const visibleProducts = useMemo(
    () => displayed.slice(0, visibleCount),
    [displayed, visibleCount],
  );

  const hasMoreProducts = visibleCount < displayed.length;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMoreProducts || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + SHOP_CATALOG_PAGE_SIZE, displayed.length),
          );
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreProducts, loading, displayed.length]);

  const handleFilterQuizComplete = useCallback(
    (answers: ShopFilterQuizAnswers) => {
      const result = applyShopFilterQuiz(answers, availableCategories);
      setCat(result.cat);
      setQuery(result.query);
      setMinPrice(result.minPrice);
      setMaxPrice(result.maxPrice);
      setOnlyBest(result.onlyBest);
      setBadgeFilter(result.badgeFilter);
      setFilterQuizOpen(false);
      filterAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [availableCategories],
  );

  const facets = useMemo(
    () => computeShopFacetCounts(catalog, filterParams, availableCategories),
    [catalog, filterParams, availableCategories],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cat !== "All") count += 1;
    if (query.trim()) count += 1;
    if (sort !== "newest") count += 1;
    if (onlyBest) count += 1;
    if (inStockOnly) count += 1;
    if (badgeFilter !== "all") count += 1;
    if (isMinPriceFilterActive(minPrice, priceBounds)) count += 1;
    if (isMaxPriceFilterActive(maxPrice, priceBounds)) count += 1;
    return count;
  }, [cat, query, sort, onlyBest, inStockOnly, badgeFilter, minPrice, maxPrice, priceBounds.min, priceBounds.max]);

  useEffect(() => {
    if (!mounted || loading || activeFilterCount === 0) return;
    const timer = window.setTimeout(() => {
      trackGa4Event("shop_filter", {
        filter_count: activeFilterCount,
        category: cat !== "All" ? cat : undefined,
        query: query.trim() || undefined,
        sort: sort !== "newest" ? sort : undefined,
        best_sellers: onlyBest || undefined,
        in_stock: inStockOnly || undefined,
        badge: badgeFilter !== "all" ? badgeFilter : undefined,
        results: displayed.length,
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    mounted,
    loading,
    activeFilterCount,
    cat,
    query,
    sort,
    onlyBest,
    inStockOnly,
    badgeFilter,
    minPrice,
    maxPrice,
    displayed.length,
  ]);

  const clearAll = () => {
    setCat("All");
    setQuery("");
    setSort("newest");
    setOnlyBest(false);
    setInStockOnly(false);
    setBadgeFilter("all");
    setMinPrice(null);
    setMaxPrice(null);
  };

  const filterChips = useMemo((): ShopFilterChip[] => {
    const chips: ShopFilterChip[] = [];
    if (cat !== "All") {
      chips.push({
        id: "cat",
        label: cat,
        onRemove: () => setCat("All"),
      });
    }
    if (query.trim()) {
      chips.push({
        id: "q",
        label: `"${query.trim()}"`,
        onRemove: () => setQuery(""),
      });
    }
    if (sort !== "newest") {
      const sortLabels: Record<SortMode, string> = {
        newest: t("pages.shop.sortNewest"),
        popular: t("pages.shop.sortPopular"),
        best_match: t("pages.shop.sortBestMatch"),
        price_asc: t("pages.shop.sortPriceAsc"),
        price_desc: t("pages.shop.sortPriceDesc"),
      };
      chips.push({
        id: "sort",
        label: sortLabels[sort],
        onRemove: () => setSort("newest"),
      });
    }
    if (onlyBest) {
      chips.push({
        id: "best",
        label: t("pages.shop.bestSellersOnly"),
        onRemove: () => setOnlyBest(false),
      });
    }
    if (inStockOnly) {
      chips.push({
        id: "stock",
        label: t("pages.shop.inStockOnly"),
        onRemove: () => setInStockOnly(false),
      });
    }
    if (badgeFilter !== "all") {
      chips.push({
        id: "badge",
        label:
          badgeFilter === "bestseller"
            ? t("product.badgeBestseller")
            : badgeFilter === "new"
              ? t("product.badgeNew")
              : t("product.badgeTrending"),
        onRemove: () => setBadgeFilter("all"),
      });
    }
    if (isMinPriceFilterActive(minPrice, priceBounds)) {
      chips.push({
        id: "min",
        label: `${t("pages.shop.minEgp")}: ${minPrice}`,
        onRemove: () => setMinPrice(null),
      });
    }
    if (isMaxPriceFilterActive(maxPrice, priceBounds)) {
      chips.push({
        id: "max",
        label: `${t("pages.shop.maxEgp")}: ${maxPrice}`,
        onRemove: () => setMaxPrice(null),
      });
    }
    return chips;
  }, [
    cat,
    query,
    sort,
    onlyBest,
    inStockOnly,
    badgeFilter,
    minPrice,
    maxPrice,
    priceBounds,
    t,
  ]);

  const filterControls = (
    <>
      <div className="cb-pl-shop-filters__row--primary">
        <div className="flex flex-wrap items-center gap-2 pb-2 sm:col-span-2">
          <ShopFilterQuizTrigger onClick={() => setFilterQuizOpen(true)} />
          <ShareWishlistButton itemCount={wishlistUuids.size} />
        </div>
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
          <option value="best_match">{t("pages.shop.sortBestMatch")}</option>
          <option value="popular">{t("pages.shop.sortPopular")}</option>
          <option value="price_asc">{t("pages.shop.sortPriceAsc")}</option>
          <option value="price_desc">{t("pages.shop.sortPriceDesc")}</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={priceBounds.min || undefined}
            max={priceBounds.max || undefined}
            value={isMinPriceFilterActive(minPrice, priceBounds) ? minPrice! : ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                setMinPrice(null);
                return;
              }
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              setMinPrice(n);
            }}
            placeholder={t("pages.shop.minEgp")}
            className="cb-pl-input min-h-10 w-full rounded-xl px-3 py-2 text-sm"
            aria-label={t("pages.shop.minEgp")}
          />
          <input
            type="number"
            min={priceBounds.min || undefined}
            max={priceBounds.max || undefined}
            value={isMaxPriceFilterActive(maxPrice, priceBounds) ? maxPrice! : ""}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                setMaxPrice(null);
                return;
              }
              const n = Number(raw);
              if (!Number.isFinite(n)) return;
              setMaxPrice(n);
            }}
            placeholder={t("pages.shop.maxEgp")}
            className="cb-pl-input min-h-10 w-full rounded-xl px-3 py-2 text-sm"
            aria-label={t("pages.shop.maxEgp")}
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
        {availableCategories.map((c) => {
          const count = facets.categories[c] ?? 0;
          const disabled = count === 0 && cat !== c;
          const label =
            c === "All" ? t("pages.shop.categoryAll") : c;
          return (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => setCat(c)}
              className={cn(
                "cb-pl-pill shrink-0 snap-start font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-caramel)] focus-visible:ring-offset-2",
                cat === c && "is-active",
                disabled && "cursor-not-allowed opacity-40",
              )}
              data-active={cat === c ? "true" : undefined}
              aria-disabled={disabled || undefined}
            >
              {t("pages.shop.facetCount", { label, count })}
            </button>
          );
        })}
      </div>

      <div className="cb-pl-shop-filters__divider space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-cb-text-strong" aria-busy={!mounted || loading}>
            {!mounted || loading
              ? t("pages.shop.loadingCookies")
              : displayed.length > visibleProducts.length
                ? t("pages.shop.showingProgress", {
                    shown: visibleProducts.length,
                    total: displayed.length,
                  })
                : t("pages.shop.showing", { filtered: displayed.length, total: catalog.length })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-cb-text">
          <button
            type="button"
            disabled={facets.bestSellers === 0 && !onlyBest}
            onClick={() => setOnlyBest((v) => !v)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
              onlyBest
                ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
              facets.bestSellers === 0 && !onlyBest && "cursor-not-allowed opacity-40",
            )}
          >
            {t("pages.shop.facetCount", {
              label: t("pages.shop.bestSellersOnly"),
              count: facets.bestSellers,
            })}
          </button>
          <button
            type="button"
            disabled={facets.inStock === 0 && !inStockOnly}
            onClick={() => setInStockOnly((v) => !v)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
              inStockOnly
                ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
              facets.inStock === 0 && !inStockOnly && "cursor-not-allowed opacity-40",
            )}
          >
            {t("pages.shop.facetCount", {
              label: t("pages.shop.inStockOnly"),
              count: facets.inStock,
            })}
          </button>
          <div className="hidden h-5 w-px bg-cb-border/70 sm:block" aria-hidden />
          {(["all", "bestseller", "new", "trending"] as const).map((b) => {
            const badgeLabel =
              b === "all"
                ? t("pages.shop.allBadges")
                : b === "bestseller"
                  ? t("product.badgeBestseller")
                  : b === "new"
                    ? t("product.badgeNew")
                    : t("product.badgeTrending");
            const count = facets.badges[b];
            const disabled = count === 0 && badgeFilter !== b;
            return (
              <button
                key={b}
                type="button"
                disabled={disabled}
                onClick={() => setBadgeFilter(b)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                  badgeFilter === b
                    ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                    : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
                  disabled && "cursor-not-allowed opacity-40",
                )}
              >
                {t("pages.shop.facetCount", { label: badgeLabel, count })}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-[var(--color-cream)] pb-24 lg:pb-20">
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

      <div className="mx-auto max-w-7xl cb-gutter pt-6 md:pt-8">
        <div
          ref={filterAnchorRef}
          id="shop-filters"
          className="cb-pl-shop-filters sticky top-16 z-20 mb-4 md:mb-6"
        >
          <div className="hidden lg:block">{filterControls}</div>
          <div className="flex items-center gap-2 lg:hidden">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("pages.shop.searchPlaceholder")}
              className="cb-pl-input min-h-10 flex-1 rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className={buttonClassName("outline", "shrink-0 rounded-xl px-4 py-2 text-sm font-bold")}
            >
              {t("pages.shop.filters")}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </button>
          </div>
          <p
            className="mt-3 text-sm font-semibold text-cb-text-strong lg:mt-4"
            aria-busy={!mounted || loading}
          >
            {!mounted || loading
              ? t("pages.shop.loadingCookies")
              : displayed.length > visibleProducts.length
                ? t("pages.shop.showingProgress", {
                    shown: visibleProducts.length,
                    total: displayed.length,
                  })
                : t("pages.shop.showing", { filtered: displayed.length, total: catalog.length })}
          </p>
        </div>

        <ShopFilterChips chips={filterChips} onClearAll={clearAll} />

        <ShopMobileFilterSheet
          open={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          activeCount={activeFilterCount}
          resultCount={displayed.length}
        >
          {filterControls}
        </ShopMobileFilterSheet>

        <ShopMobileFilterBar
          activeCount={activeFilterCount}
          onOpen={() => setMobileFiltersOpen(true)}
        />

        {initialTrending.length > 0 ? (
          <section
            className="mb-10 border-b border-cb-border/60 pb-10"
            aria-labelledby="shop-trending-heading"
          >
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
          <h2 id="shop-catalog-heading" className="sr-only">
            {t("pages.shop.catalogTitle")}
          </h2>

        {loading ? (
          <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="cb-pl-skeleton aspect-[3/4] w-full" />
            ))}
          </div>
        ) : null}
        {error ? <p className="py-4 text-center text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              wishlisted={p.productUuid ? wishlistUuids.has(p.productUuid) : false}
              onWishlistToggled={onWishlistToggled}
            />
          ))}
        </div>

        {hasMoreProducts && !loading ? (
          <div ref={loadMoreRef} className="py-8 text-center" aria-hidden>
            <p className="text-sm font-medium text-cb-text-muted">
              {t("pages.shop.showingProgress", {
                shown: visibleProducts.length,
                total: displayed.length,
              })}
            </p>
          </div>
        ) : null}

        {!loading && displayed.length === 0 ? (
          <div className="cb-pl-empty">
            <h3>{t("pages.shop.noMatch")}</h3>
            <p className="mt-2">{t("pages.shop.subtitle")}</p>
            <button type="button" onClick={clearAll} className={buttonClassName("primary", "mt-6")}>
              {t("pages.shop.resetFilters")}
            </button>
          </div>
        ) : null}
        </section>

        <section className="mt-16 border-t border-cb-border pt-10">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong sm:text-2xl">
            {t("pages.shop.seoSectionTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cb-text sm:text-base">
            {t("pages.shop.seoSectionBody")}
          </p>
          <SeoRelatedLinks
            className="mt-5"
            ariaLabel={t("pages.shop.seoRelatedAria")}
            links={getShopRelatedLinks(lang)}
          />
        </section>
      </div>

      <ShopFilterQuiz
        open={filterQuizOpen}
        onClose={() => setFilterQuizOpen(false)}
        onComplete={handleFilterQuizComplete}
      />
    </div>
  );
}
