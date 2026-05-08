import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-cb-cream py-20">
      <div className="mx-auto max-w-3xl cb-gutter text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cb-terracotta-dark">
          404
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl">
          This page wandered out of the oven
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-cb-text-muted">
          We couldn&apos;t find the page you requested. Try searching for a flavor,
          explore our shop, or jump to one of the most visited pages.
        </p>

        <form action="/search" className="mx-auto mt-8 flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            placeholder="Search cookies, gift boxes, or topics..."
            className="min-h-[48px] flex-1 rounded-2xl border border-cb-border bg-cb-surface px-4 text-base outline-none focus:ring-2 focus:ring-cb-focus"
          />
          <button type="submit" className={buttonClassName("primary", "min-h-[48px] px-5")}>
            Search
          </button>
        </form>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/shop", label: "Shop cookies" },
            { href: "/gift-box", label: "Build a gift box" },
            { href: "/our-cookies", label: "Explore flavors" },
            { href: "/help/faq", label: "Read FAQ" },
            { href: "/our-story", label: "Our story" },
            { href: "/contact", label: "Contact us" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-cb-border bg-cb-surface px-4 py-3 text-sm font-semibold text-cb-text-strong transition hover:bg-cb-peach/40"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

