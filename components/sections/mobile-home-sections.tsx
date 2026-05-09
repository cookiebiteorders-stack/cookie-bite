"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Mail, Sparkles, Heart, Truck, Star, Plus, ArrowRight } from "lucide-react";
import { CATEGORY_CARDS, IMAGES, INSTAGRAM_GRID, TESTIMONIALS, SITE } from "@/lib/data";
import { BRAND } from "@/lib/brand";

function MobileHero() {
  return (
    <section className="mobile-hero">
      <Image
        src={IMAGES.heroStack}
        alt="Cookie Bite cookies"
        fill
        className="mobile-hero__image object-cover opacity-30"
        sizes="100vw"
        priority
      />
      <div className="mobile-hero__content">
        <p className="mobile-hero__eyebrow">A bite of happiness</p>
        <h1 className="mobile-hero__h1">
          Handcrafted cookies,<br />made to share
        </h1>
        <p className="mobile-hero__sub">
          Small-batch baked in New Cairo with real butter and premium ingredients.
        </p>
        <div className="mobile-hero__buttons">
          <Link href="/shop" className="mobile-btn-primary mobile-btn-pill">
            Shop Now
          </Link>
          <Link href="/our-cookies" className="mobile-btn-outline mobile-btn-pill">
            Our Cookies
          </Link>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-cb-text-muted">
          <div className="flex">
            {[1,2,3].map(i => (
              <div key={i} className={`w-6 h-6 rounded-full bg-cb-peach border-2 border-cb-cream ${i > 1 ? '-ml-2' : ''}`} />
            ))}
          </div>
          <span>10K+ happy customers</span>
        </div>
      </div>
      <div className="mobile-hero__scroll-hint">
        <ChevronDown className="w-5 h-5 text-cb-text-muted" />
      </div>
    </section>
  );
}

function MobileFeaturePills() {
  const pills = [
    { icon: Sparkles, label: "Premium Ingredients" },
    { icon: Heart, label: "Baked with Love" },
    { icon: Truck, label: "Fast Delivery" },
    { icon: Star, label: "100% Satisfaction" },
  ];
  return (
    <div className="mobile-pills">
      {pills.map(p => (
        <div key={p.label} className="mobile-pill">
          <p.icon className="mobile-pill__icon" />
          <span>{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function MobileCategoryCarousel() {
  return (
    <section>
      <div className="mobile-section">
        <p className="mobile-section__eyebrow">Explore Our World</p>
        <h2 className="mobile-section__h2">Find your perfect treat</h2>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-cat-carousel">
        {CATEGORY_CARDS.map(c => (
          <Link key={c.title} href={c.href} className="mobile-cat-card">
            <Image src={c.image} alt={c.title} width={320} height={234} className="mobile-cat-card__img" />
            <div className="mobile-cat-card__body">
              <p className="mobile-cat-card__title">{c.title}</p>
              <p className="mobile-cat-card__sub">{c.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MobileStorySnippet() {
  return (
    <section className="mobile-story-card">
      <Image
        src={IMAGES.storyMug}
        alt="Cookie Bite kitchen"
        width={600}
        height={400}
        className="mobile-story-card__img"
      />
      <p className="mobile-story-card__eyebrow">Our Story</p>
      <h2 className="mobile-story-card__h2">Baked with love. Packed with joy.</h2>
      <p className="mobile-story-card__body">
        What started as weekend bakes for friends became a small kitchen obsessed with the perfect chew.
      </p>
      <Link href="/our-story" className="text-sm font-semibold text-cb-terracotta-dark flex items-center gap-1">
        Meet our makers <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

function MobileReviews() {
  return (
    <section>
      <div className="mobile-section">
        <h2 className="mobile-section__h2">Real stories. Real smiles.</h2>
        <p className="text-center text-[13px] text-cb-text-muted mt-1">
          What our customers say
        </p>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-reviews-carousel">
        {TESTIMONIALS.map(t => (
          <div key={t.name} className="mobile-review-card">
            <div className="mobile-review-card__stars">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className="w-3.5 h-3.5 fill-[var(--cb-star)] text-[var(--cb-star)]" />
              ))}
            </div>
            <p className="mobile-review-card__quote">&ldquo;{t.quote}&rdquo;</p>
            <div className="mobile-review-card__author">
              <div className={`mobile-review-card__avatar ${t.color} w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-cb-text-strong`}>
                {t.initial}
              </div>
              <div>
                <p className="mobile-review-card__name">{t.name}</p>
                <p className="text-[11px] text-cb-text-muted">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MobileInstagramGrid() {
  return (
    <section>
      <div className="mobile-section">
        <p className="mobile-section__eyebrow">Follow Our Sweet World</p>
        <h2 className="text-center text-lg font-semibold text-cb-terracotta-dark">
          {SITE.handle}
        </h2>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-insta-grid">
        {INSTAGRAM_GRID.slice(0, 6).map((url, i) => (
          <Image key={i} src={url} alt="" width={200} height={200} />
        ))}
      </div>
      <div className="flex justify-center mt-4">
        <a
          href={BRAND.social.instagram}
          target="_blank"
          rel="noreferrer"
          className="mobile-btn-outline mobile-btn-pill text-sm gap-1.5 h-[44px]"
        >
          Follow us on Instagram
        </a>
      </div>
    </section>
  );
}

function MobileNewsletter() {
  return (
    <section className="mobile-newsletter">
      <Mail className="mobile-newsletter__icon" />
      <h3 className="mobile-newsletter__h3">Get sweet updates</h3>
      <p className="mobile-newsletter__body">
        Subscribe for exclusive flavors, early access, and special offers.
      </p>
      <input
        type="email"
        placeholder="Enter your email"
        className="mobile-newsletter__input"
        aria-label="Email address"
      />
      <button type="button" className="mobile-newsletter__btn">
        Subscribe
      </button>
    </section>
  );
}

export function MobileHomeSections() {
  return (
    <div className="md:hidden">
      <MobileHero />
      <MobileFeaturePills />
      <div className="mobile-spacer-lg" />
      <MobileCategoryCarousel />
      <div className="mobile-spacer-lg" />
      <MobileStorySnippet />
      <div className="mobile-spacer-lg" />
      <MobileReviews />
      <div className="mobile-spacer-lg" />
      <MobileInstagramGrid />
      <div className="mobile-spacer-lg" />
      <MobileNewsletter />
      <div className="mobile-spacer-lg" />
    </div>
  );
}
