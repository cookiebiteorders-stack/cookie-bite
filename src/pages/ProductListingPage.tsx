"use client";

import { PRODUCTS } from "@/src/data/products";
import { SearchProductCard } from "@/src/components/search/ProductCard";
import { Pagination } from "@/src/components/ui/Pagination";
import { useState } from "react";

const PAGE_SIZE = 12;

export function ProductListingPageClient() {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(PRODUCTS.length / PAGE_SIZE));
  const pageItems = PRODUCTS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-cb-border bg-cb-surface p-5">
        <p className="text-xs uppercase tracking-wider text-cb-text-muted">Collection</p>
        <h1 className="mt-2 font-layout-heading text-3xl font-semibold text-cb-text-strong">
          All Products
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-cb-text-muted">
          Explore our catalog, compare styles, and discover your next favorite piece.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pageItems.map((product) => (
          <SearchProductCard key={product.id} product={product} />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

