import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, Heart, Leaf, Sparkles, Star } from "lucide-react";
import { OUR_COOKIE_SECTIONS } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { ProductCard } from "@/components/product/product-card";
import { buttonClassName } from "@/components/ui/button";
import { buildPageMetadata, buildBreadcrumbJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildPageMetadata({
  title: "Our Cookie Flavors",
  description:
    "Discover Cookie Bite flavor collections with handcrafted textures, premium ingredients, and seasonal specials in New Cairo.",
  path: "/our-cookies",
  keywords: [
    "cookie flavors cairo",
    "best cookie menu egypt",
    "artisan cookies new cairo",
    "seasonal cookies",
  ],
});

const iconMap = {
  cookie: Cookie,
  heart: Heart,
  sparkles: Sparkles,
  star: Star,
  leaf: Leaf,
} as const;

export default function OurCookiesPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Our Cookies", path: "/our-cookies" },
  ]);
  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          eyebrow="Our menu"
          title="Discover our flavors"
          subtitle="Each collection is baked with its own personality — from everyday classics to indulgent specials."
        />

        {/* شريط فئات أفقي — تمرير على الموبايل */}
        <nav
          className="-mx-1 mb-12 rounded-2xl border border-cb-peach-deep/50 bg-cb-surface/95 px-2 py-3 shadow-sm backdrop-blur-md dark:border-cb-border/60 dark:bg-cb-surface-elevated/95"
          aria-label="Cookie collections"
        >
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cb-peach-deep/50">
            {OUR_COOKIE_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={cn(
                  "shrink-0 snap-start rounded-full border border-cb-border bg-cb-cream px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-cb-text-strong",
                  "transition hover:border-cb-border-strong hover:bg-cb-peach/70 dark:bg-cb-surface-2 dark:hover:bg-cb-peach-deep/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-cb-surface",
                )}
              >
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-16 md:space-y-20">
          {OUR_COOKIE_SECTIONS.map((section) => {
            const Icon = iconMap[section.icon];
            const shopHref = `/shop?cat=${encodeURIComponent(section.shopCategory)}`;
            return (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-36 md:scroll-mt-40"
              >
                {/* رأس القسم — أفقي */}
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
                        {section.title}
                      </h2>
                      <p className="max-w-2xl text-sm leading-relaxed text-cb-text sm:text-base">
                        {section.description}
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
                    Shop {section.title}
                  </Link>
                </div>

                {/* منتجات القسم — شريط أفقي مع تمرير */}
                {section.items.length > 0 ? (
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
                          <ProductCard product={item} className="h-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "mt-6 rounded-2xl border border-dashed border-cb-border-strong bg-cb-surface/80 px-6 py-10 text-center",
                      "dark:bg-cb-surface-2/80",
                    )}
                  >
                    <p className="text-sm font-medium text-cb-text">
                      Products in this collection will appear here once they&apos;re added to the
                      menu.
                    </p>
                    <Link
                      href={shopHref}
                      className={cn(
                        "mt-4 inline-flex text-sm font-bold text-cb-terracotta-dark underline-offset-4 hover:underline",
                        "dark:text-cb-terracotta",
                      )}
                    >
                      Browse {section.title} in the shop →
                    </Link>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
