"use client";

import Link from "next/link";
import { OUR_COOKIE_SECTION_DEFS } from "@/lib/data";

export function MobileOurCookiesView() {
  return (
    <div className="md:hidden bg-cb-cream min-h-screen">
      {/* Hero / Header */}
      <section className="mobile-section pt-6">
        <p className="mobile-section__eyebrow">Our Menu</p>
        <h1 className="mobile-section__h2">Discover our flavors</h1>
        <p className="text-center text-sm text-cb-text-muted mt-2">
          Each collection is baked with its own personality.
        </p>
      </section>

      {/* Sticky categories nav */}
      <nav className="mobile-filter-tabs">
        {OUR_COOKIE_SECTION_DEFS.map((section) => (
          <Link
            key={section.id}
            href={`#${section.id}`}
            className="mobile-filter-tab"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            {section.shopCategory}
          </Link>
        ))}
      </nav>

      <div className="mobile-spacer-md" />

      {/* Collections */}
      <div className="space-y-10 pb-20">
        {OUR_COOKIE_SECTION_DEFS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <div className="px-4 mb-4">
              <h2 className="text-xl font-bold text-cb-text-strong">{section.shopCategory}</h2>
            </div>
            <div className="px-4">
              <Link
                href={`/shop?cat=${encodeURIComponent(section.shopCategory)}`}
                className="inline-flex text-sm font-bold text-cb-terracotta-dark"
              >
                Browse in shop →
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
