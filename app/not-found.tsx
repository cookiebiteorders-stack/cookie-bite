import Link from "next/link";
import { Search, Cookie } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-cb-cream py-20">
      <div className="mx-auto max-w-3xl cb-gutter text-center">
        <div className="mb-8 inline-flex rounded-full bg-cb-peach/30 p-6">
          <Cookie className="h-16 w-16 text-cb-terracotta-dark" />
        </div>
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
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cb-text-muted" />
            <input
              type="search"
              name="q"
              placeholder="Search cookies, gift boxes, or topics..."
              className="min-h-[48px] w-full rounded-2xl border border-cb-border bg-cb-surface px-4 pr-10 text-base outline-none focus:ring-2 focus:ring-cb-focus"
            />
          </div>
          <button type="submit" className={buttonClassName("primary", "min-h-[48px] px-6")}>
            Search
          </button>
        </form>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/shop"
            className={buttonClassName("primary", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
          >
            Shop Cookies
          </Link>
          <Link
            href="/gift-box"
            className={buttonClassName("outline", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
          >
            Build Gift Box
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
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

