"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  Mail,
  Sparkles,
  Heart,
  Truck,
  Star,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { CATEGORY_CARDS, IMAGES, INSTAGRAM_GRID, TESTIMONIALS, SITE } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { useLanguage } from "@/components/providers/language-provider";

const EXPLORE_CARD_KEYS = ["classic", "seasonal", "gifts", "bites"] as const;

function MobileHero() {
  const { t } = useLanguage();

  return (
    <section className="mobile-hero">
      <Image
        src={IMAGES.heroStack}
        alt={t("mobileHome.heroAlt")}
        fill
        className="mobile-hero__image object-cover opacity-30"
        sizes="100vw"
        priority
        fetchPriority="high"
      />
      <div className="mobile-hero__content">
        <p className="mobile-hero__eyebrow">{t("mobileHome.heroEyebrow")}</p>
        <h1 className="mobile-hero__h1">
          {t("mobileHome.heroH1Line1")}
          <br />
          {t("mobileHome.heroH1Line2")}
        </h1>
        <p className="mobile-hero__sub">{t("mobileHome.heroSub")}</p>
        <div className="mobile-hero__buttons">
          <Link href="/shop" className="mobile-btn-primary mobile-btn-pill">
            {t("mobileHome.heroShopNow")}
          </Link>
          <Link href="/our-cookies" className="mobile-btn-outline mobile-btn-pill">
            {t("mobileHome.heroOurCookies")}
          </Link>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-cb-text-muted">
          <div className="flex">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-6 w-6 rounded-full border-2 border-cb-cream bg-cb-peach ${i > 1 ? "-ms-2" : ""}`}
              />
            ))}
          </div>
          <span>{t("mobileHome.heroSocialProof")}</span>
        </div>
      </div>
      <div className="mobile-hero__scroll-hint">
        <ChevronDown className="h-5 w-5 text-cb-text-muted" aria-hidden />
      </div>
    </section>
  );
}

function MobileFeaturePills() {
  const { t } = useLanguage();
  const pills = [
    { icon: Sparkles, labelKey: "mobileHome.pillPremium" as const },
    { icon: Heart, labelKey: "mobileHome.pillBaked" as const },
    { icon: Truck, labelKey: "mobileHome.pillDelivery" as const },
    { icon: Star, labelKey: "mobileHome.pillSatisfaction" as const },
  ];
  return (
    <div className="mobile-pills">
      {pills.map((p) => (
        <div key={p.labelKey} className="mobile-pill">
          <p.icon className="mobile-pill__icon" aria-hidden />
          <span>{t(p.labelKey)}</span>
        </div>
      ))}
    </div>
  );
}

function MobileCategoryCarousel() {
  const { t } = useLanguage();

  return (
    <section>
      <div className="mobile-section">
        <p className="mobile-section__eyebrow">{t("mobileHome.exploreEyebrow")}</p>
        <h2 className="mobile-section__h2">{t("mobileHome.exploreTitle")}</h2>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-cat-carousel">
        {CATEGORY_CARDS.map((c, i) => {
          const key = EXPLORE_CARD_KEYS[i];
          const title = t(`explore.cards.${key}.title`);
          const subtitle = t(`explore.cards.${key}.subtitle`);
          return (
            <Link key={c.href} href={c.href} className="mobile-cat-card">
              <Image
                src={c.image}
                alt={title}
                width={320}
                height={234}
                className="mobile-cat-card__img"
              />
              <div className="mobile-cat-card__body">
                <p className="mobile-cat-card__title">{title}</p>
                <p className="mobile-cat-card__sub">{subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MobileStorySnippet() {
  const { t, lang } = useLanguage();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="mobile-story-card">
      <Image
        src={IMAGES.storyMug}
        alt={t("mobileHome.storyAlt")}
        width={600}
        height={400}
        className="mobile-story-card__img"
      />
      <p className="mobile-story-card__eyebrow">{t("mobileHome.storyEyebrow")}</p>
      <h2 className="mobile-story-card__h2">{t("mobileHome.storyH2")}</h2>
      <p className="mobile-story-card__body">{t("mobileHome.storyBody")}</p>
      <Link
        href="/our-story"
        className="flex items-center gap-1 text-sm font-semibold text-cb-terracotta-dark"
      >
        {t("mobileHome.storyCta")} <Arrow className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </section>
  );
}

function MobileReviews() {
  const { t } = useLanguage();

  return (
    <section>
      <div className="mobile-section">
        <h2 className="mobile-section__h2">{t("mobileHome.reviewsH2")}</h2>
        <p className="mt-1 text-center text-[13px] text-cb-text-muted">
          {t("mobileHome.reviewsSub")}
        </p>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-reviews-carousel">
        {TESTIMONIALS.map((item, idx) => {
          const key = String(idx) as "0" | "1" | "2";
          return (
            <div key={item.name} className="mobile-review-card">
              <div className="mobile-review-card__stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className="h-3.5 w-3.5 fill-[var(--cb-star)] text-[var(--cb-star)]"
                    aria-hidden
                  />
                ))}
              </div>
              <p className="mobile-review-card__quote">
                &ldquo;{t(`testimonials.items.${key}.quote`)}&rdquo;
              </p>
              <div className="mobile-review-card__author">
                <div
                  className={`mobile-review-card__avatar ${item.color} flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-cb-text-strong`}
                  aria-hidden
                >
                  {item.initial}
                </div>
                <div>
                  <p className="mobile-review-card__name">
                    {t(`testimonials.items.${key}.name`)}
                  </p>
                  <p className="text-[11px] text-cb-text-muted">
                    {t(`testimonials.items.${key}.role`)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MobileInstagramGrid() {
  const { t } = useLanguage();

  return (
    <section>
      <div className="mobile-section">
        <p className="mobile-section__eyebrow">{t("mobileHome.instaEyebrow")}</p>
        <h2 className="text-center text-lg font-semibold text-cb-terracotta-dark">
          {SITE.handle}
        </h2>
      </div>
      <div className="mobile-spacer-sm" />
      <div className="mobile-insta-grid">
        {INSTAGRAM_GRID.slice(0, 6).map((url, i) => (
          <Image
            key={i}
            src={url}
            alt={t("instagram.galleryAlt", { n: i + 1 })}
            width={200}
            height={200}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <a
          href={BRAND.social.instagram}
          target="_blank"
          rel="noreferrer"
          className="mobile-btn-outline mobile-btn-pill h-[44px] gap-1.5 text-sm"
        >
          {t("mobileHome.instaCta")}
        </a>
      </div>
    </section>
  );
}

function MobileNewsletter() {
  const { t } = useLanguage();

  return (
    <section className="mobile-newsletter">
      <Mail className="mobile-newsletter__icon" aria-hidden />
      <h3 className="mobile-newsletter__h3">{t("mobileHome.newsletterH3")}</h3>
      <p className="mobile-newsletter__body">{t("mobileHome.newsletterBody")}</p>
      <input
        type="email"
        placeholder={t("mobileHome.newsletterPlaceholder")}
        className="mobile-newsletter__input"
        aria-label={t("newsletter.emailLabel")}
      />
      <button type="button" className="mobile-newsletter__btn">
        {t("newsletter.subscribe")}
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
