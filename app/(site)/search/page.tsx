import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Cookie Bite products.",
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const results = query
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query),
      )
    : PRODUCTS;

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Shop"
          title={query ? `Results for “${q}”` : "Browse all flavors"}
          subtitle="Instant search — full filters and URL state arrive with the commerce phase."
        />
        <form className="mt-8 max-w-xl" action="/search" method="get" role="search">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search cookies, flavors…"
            className="w-full rounded-full border-2 border-cb-border bg-cb-surface px-5 py-3 text-sm text-cb-text outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
          />
        </form>
        {results.length === 0 ? (
          <p className="mt-12 text-center text-cb-text-muted">
            No matches — try another term or{" "}
            <Link href="/shop" className="font-bold text-cb-terracotta-dark hover:underline">
              view the shop
            </Link>
            .
          </p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
