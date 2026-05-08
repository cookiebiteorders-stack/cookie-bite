"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PRODUCTS } from "@/src/data/products";
import { useDebounce } from "@/src/hooks/useDebounce";
import { useSearchStore } from "@/src/store/searchStore";
import { Input } from "@/src/components/ui/Input";
import { Select } from "@/src/components/ui/Select";
import { RangeSlider } from "@/src/components/ui/RangeSlider";
import { Pagination } from "@/src/components/ui/Pagination";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { SearchProductCard, SearchProductRow } from "@/src/components/search/ProductCard";
import { Badge } from "@/src/components/ui/Badge";

const PAGE_SIZE = 9;

export function SearchPageClient() {
  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.setFilters);
  const clearFilters = useSearchStore((s) => s.clearFilters);
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const debouncedQuery = useDebounce(filters.query, 300);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") as typeof filters.sort | null;
    const page = Number(searchParams.get("page") ?? 1);
    setFilters({
      query: q,
      categories: category ? [category] : [],
      sort: sort ?? "popular",
      page: Number.isFinite(page) ? page : 1,
    });
  }, [searchParams, setFilters]);

  useEffect(() => {
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), 220);
    return () => window.clearTimeout(id);
  }, [debouncedQuery, filters.sort, filters.page, filters.minPrice, filters.maxPrice, filters.categories]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.categories[0]) params.set("category", filters.categories[0]);
    if (filters.sort !== "popular") params.set("sort", filters.sort);
    if (filters.page > 1) params.set("page", String(filters.page));
    router.replace(params.toString() ? `${pathname}?${params}` : pathname);
  }, [filters.query, filters.categories, filters.sort, filters.page, pathname, router]);

  const categories = useMemo(
    () => Array.from(new Set(PRODUCTS.map((p) => p.category))),
    [],
  );
  const brands = useMemo(() => Array.from(new Set(PRODUCTS.map((p) => p.brand))), []);
  const availableSizes = useMemo(
    () => Array.from(new Set(PRODUCTS.flatMap((p) => p.sizes))),
    [],
  );
  const availableColors = useMemo(
    () => Array.from(new Set(PRODUCTS.flatMap((p) => p.colors.map((c) => c.name)))),
    [],
  );

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const q = debouncedQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);
      const matchCategory =
        !filters.categories.length || filters.categories.includes(p.category);
      const matchPriceMin = filters.minPrice == null || p.price >= filters.minPrice;
      const matchPriceMax = filters.maxPrice == null || p.price <= filters.maxPrice;
      const matchStock = !filters.inStockOnly || p.inStock;
      const matchBrand = !filters.brands.length || filters.brands.includes(p.brand);
      const matchRating = filters.minRating == null || p.rating >= filters.minRating;
      const matchSize =
        !filters.sizes.length || p.sizes.some((size) => filters.sizes.includes(size));
      const matchColor =
        !filters.colors.length ||
        p.colors.some((color) => filters.colors.includes(color.name));
      return (
        matchQuery &&
        matchCategory &&
        matchPriceMin &&
        matchPriceMax &&
        matchStock &&
        matchBrand &&
        matchRating &&
        matchSize &&
        matchColor
      );
    });
  }, [
    debouncedQuery,
    filters.categories,
    filters.minPrice,
    filters.maxPrice,
    filters.inStockOnly,
    filters.brands,
    filters.minRating,
    filters.sizes,
    filters.colors,
  ]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (filters.sort) {
      case "newest":
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        break;
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => b.reviewCount - a.reviewCount);
    }
    return list;
  }, [filtered, filters.sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilterCount =
    filters.categories.length +
    filters.brands.length +
    filters.colors.length +
    filters.sizes.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.minRating ? 1 : 0);

  const suggestionSections = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    const recent = ["new arrivals", "sneakers", "minimal black", "best rated"];
    const trending = ["streetwear", "summer fit", "top reviewed"];
    const products = Array.from(
      new Set(
        PRODUCTS.map((p) => p.name).filter((v) =>
          q ? v.toLowerCase().includes(q) : true,
        ),
      ),
    ).slice(0, 4);
    const cats = Array.from(
      new Set(
        PRODUCTS.map((p) => p.category).filter((v) =>
          q ? v.toLowerCase().includes(q) : true,
        ),
      ),
    ).slice(0, 3);
    return [
      { title: "Recent", items: q ? recent.filter((i) => i.includes(q)) : recent.slice(0, 4) },
      { title: "Trending", items: q ? trending.filter((i) => i.includes(q)) : trending },
      { title: "Products", items: products },
      { title: "Categories", items: cats },
    ].filter((s) => s.items.length > 0);
  }, [filters.query]);

  const flatSuggestions = useMemo(
    () => suggestionSections.flatMap((s) => s.items),
    [suggestionSections],
  );

  const applySuggestion = (value: string) => {
    setFilters({ query: value, page: 1 });
    setSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
  };

  const filterPanel = (
    <aside className="space-y-5 rounded-xl border border-cb-border bg-cb-surface p-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">Category</p>
        <div className="mt-2 space-y-2">
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 text-sm text-cb-text-strong">
              <input
                type="checkbox"
                checked={filters.categories.includes(cat)}
                onChange={(e) =>
                  setFilters({
                    categories: e.target.checked ? [cat] : [],
                    page: 1,
                  })
                }
              />
              {cat}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">Brand</p>
        <div className="mt-2 max-h-32 space-y-2 overflow-auto">
          {brands.map((brand) => (
            <label key={brand} className="flex items-center gap-2 text-sm text-cb-text-strong">
              <input
                type="checkbox"
                checked={filters.brands.includes(brand)}
                onChange={(e) =>
                  setFilters({
                    brands: e.target.checked
                      ? [...filters.brands, brand]
                      : filters.brands.filter((b) => b !== brand),
                    page: 1,
                  })
                }
              />
              {brand}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">Price</p>
        <RangeSlider
          min={30}
          max={180}
          value={[filters.minPrice ?? 30, filters.maxPrice ?? 180]}
          onChange={([min, max]) => setFilters({ minPrice: min, maxPrice: max, page: 1 })}
        />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">Rating</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilters({ minRating: filters.minRating === r ? null : r, page: 1 })}
              className={`rounded-md border px-2 py-1 text-xs ${
                filters.minRating === r
                  ? "border-cb-terracotta-dark text-cb-terracotta-dark"
                  : "border-cb-border text-cb-text-muted"
              }`}
            >
              {r}★ & up
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">In Stock</p>
        <label className="mt-2 flex items-center gap-2 text-sm text-cb-text-strong">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => setFilters({ inStockOnly: e.target.checked, page: 1 })}
          />
          Available now
        </label>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">Size</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {availableSizes.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() =>
                setFilters({
                  sizes: filters.sizes.includes(size)
                    ? filters.sizes.filter((s) => s !== size)
                    : [...filters.sizes, size],
                  page: 1,
                })
              }
              className={`rounded-md border px-2 py-1 text-xs ${
                filters.sizes.includes(size)
                  ? "border-cb-terracotta-dark text-cb-terracotta-dark"
                  : "border-cb-border text-cb-text-muted"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">Color</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {availableColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() =>
                setFilters({
                  colors: filters.colors.includes(color)
                    ? filters.colors.filter((c) => c !== color)
                    : [...filters.colors, color],
                  page: 1,
                })
              }
              className={`rounded-full border px-3 py-1 text-xs ${
                filters.colors.includes(color)
                  ? "border-cb-terracotta-dark text-cb-terracotta-dark"
                  : "border-cb-border text-cb-text-muted"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={clearFilters}
        className="text-sm font-semibold text-cb-terracotta-dark hover:underline"
      >
        Clear all filters
      </button>
    </aside>
  );

  return (
    <div className="bg-cb-cream pb-24 pt-8">
      <div className="mx-auto max-w-7xl cb-gutter">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-layout-heading text-2xl font-semibold text-cb-text-strong">
              Results for "{filters.query || "all"}"
            </h1>
            <p className="text-sm text-cb-text-muted">{sorted.length} items found</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-cb-border px-3 text-sm lg:hidden"
              onClick={() => setMobileFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount ? (
                <span className="rounded-full bg-cb-terracotta-dark px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <Select
              value={filters.sort}
              options={[
                { value: "popular", label: "Most Popular" },
                { value: "newest", label: "Newest" },
                { value: "price_asc", label: "Price: Low to High" },
                { value: "price_desc", label: "Price: High to Low" },
                { value: "rating", label: "Top Rated" },
              ]}
              onChange={(value) => setFilters({ sort: value as typeof filters.sort, page: 1 })}
            />
            <Select
              value={filters.view}
              options={[
                { value: "grid", label: "Grid View" },
                { value: "list", label: "List View" },
              ]}
              onChange={(value) => setFilters({ view: value as "grid" | "list" })}
            />
          </div>
        </div>

        <div className="relative mb-6 max-w-xl">
          <Input
            variant="search"
            value={filters.query}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
            onKeyDown={(e) => {
              if (!flatSuggestions.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestionIndex((i) => Math.min(flatSuggestions.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestionIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
                e.preventDefault();
                applySuggestion(flatSuggestions[activeSuggestionIndex]);
              } else if (e.key === "Escape") {
                setSuggestionsOpen(false);
              }
            }}
            onChange={(e) => {
              setFilters({ query: e.target.value, page: 1 });
              setSuggestionsOpen(true);
              setActiveSuggestionIndex(-1);
            }}
            placeholder="Search products, brands, categories..."
          />
          {suggestionsOpen && flatSuggestions.length ? (
            <ul
              role="listbox"
              className="absolute z-30 mt-2 w-full rounded-lg border border-cb-border bg-cb-surface p-1 shadow-lg"
            >
              {(() => {
                let idx = -1;
                return suggestionSections.map((section) => (
                  <li key={section.title} className="p-1">
                    <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-cb-text-muted">
                      {section.title}
                    </p>
                    <ul>
                      {section.items.map((item) => {
                        idx += 1;
                        const current = idx;
                        return (
                          <li key={`${section.title}-${item}`}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={activeSuggestionIndex === current}
                              onClick={() => applySuggestion(item)}
                              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                                activeSuggestionIndex === current
                                  ? "bg-cb-hover-overlay text-cb-text-strong"
                                  : "text-cb-text-muted hover:bg-cb-hover-overlay"
                              }`}
                            >
                              {item}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ));
              })()}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block">{filterPanel}</div>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {filters.categories.map((c) => (
                <Badge key={c} variant="outline">
                  {c}
                </Badge>
              ))}
              {filters.brands.map((b) => (
                <Badge key={b} variant="outline">
                  {b}
                </Badge>
              ))}
              {filters.inStockOnly ? <Badge variant="success">In stock</Badge> : null}
            </div>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={i} shape="card" />
                ))}
              </div>
            ) : pageItems.length === 0 ? (
              <div className="rounded-xl border border-cb-border bg-cb-surface p-10 text-center">
                <p className="text-lg font-semibold text-cb-text-strong">
                  No results found
                </p>
                <p className="mt-2 text-sm text-cb-text-muted">
                  Try broader terms or clear active filters.
                </p>
              </div>
            ) : filters.view === "grid" ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((product) => (
                  <SearchProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {pageItems.map((product) => (
                  <SearchProductRow key={product.id} product={product} />
                ))}
              </div>
            )}

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={(next) => setFilters({ page: next })}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[88] lg:hidden"
          >
            <button
              type="button"
              className="absolute inset-0 bg-cb-scrim-strong/65"
              aria-label="Close filters"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-cb-border bg-cb-surface p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-cb-text-strong">Filters</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-sm font-semibold text-cb-terracotta-dark"
                >
                  Done
                </button>
              </div>
              {filterPanel}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

