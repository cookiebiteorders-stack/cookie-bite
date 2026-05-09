"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Heart } from "lucide-react";
import { OUR_COOKIE_SECTIONS } from "@/lib/data";
import { cn } from "@/lib/utils";

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
        {OUR_COOKIE_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={`#${section.id}`}
            className="mobile-filter-tab"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
          >
            {section.title}
          </Link>
        ))}
      </nav>

      <div className="mobile-spacer-md" />

      {/* Collections */}
      <div className="space-y-10 pb-20">
        {OUR_COOKIE_SECTIONS.map((section) => {
          return (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="px-4 mb-4">
                <h2 className="text-xl font-bold text-cb-text-strong">{section.title}</h2>
                <p className="text-sm text-cb-text-muted mt-1">{section.description}</p>
              </div>

              {section.items.length > 0 ? (
                <div className="mobile-product-grid">
                  {section.items.map((item) => (
                    <div key={item.id} className="mobile-product-card">
                      <div className="mobile-product-card__img-wrap">
                        <Image src={item.image} alt={item.name} fill className="mobile-product-card__img" sizes="50vw" />
                        {item.badges?.[0] && (
                          <span className="mobile-product-card__badge">
                            {item.badges[0] === "bestseller" ? "Best Seller" : item.badges[0] === "trending" ? "Trending" : "New"}
                          </span>
                        )}
                        <button type="button" className="mobile-product-card__heart" aria-label="Add to wishlist">
                          <Heart />
                        </button>
                      </div>
                      <div className="mobile-product-card__body">
                        <p className="mobile-product-card__name">{item.name}</p>
                        <p className="mobile-product-card__desc">{item.description}</p>
                        <div className="mobile-product-card__price-row">
                          <span className="mobile-product-card__price">{item.price} EGP</span>
                          <button type="button" className="mobile-product-card__add-btn" aria-label="Add to cart">
                            <Plus />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4">
                  <div className="rounded-2xl border border-dashed border-cb-border-strong bg-cb-surface/80 px-6 py-8 text-center">
                    <p className="text-sm font-medium text-cb-text">
                      Products in this collection will appear here soon.
                    </p>
                    <Link
                      href={`/shop?cat=${encodeURIComponent(section.title)}`}
                      className="mt-3 inline-flex text-sm font-bold text-cb-terracotta-dark"
                    >
                      Browse in shop →
                    </Link>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
