"use client";

import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { buttonClassName } from "@/components/ui/button";
import { HeroTrustPills, HeroVisual } from "@/components/ui/hero-visual";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const HeroAnnouncement = dynamic(
  () =>
    import("@/components/announcements/hero-announcement").then((m) => ({
      default: m.HeroAnnouncement,
    })),
  { ssr: false, loading: () => null },
);

type HeroSection5CopyProps = {
  kicker?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;
};

export function HeroSection5Copy({
  kicker,
  title,
  body,
  actions,
}: HeroSection5CopyProps) {
  const { t } = useLanguage();

  const kickerBlock =
    kicker ??
    (
      <div className="cb-hero-kicker-wrap">
        <p className="cb-hero-kicker-badge">{t("hero.kicker")}</p>
        <p className="cb-hero-brand-name font-playful">{t("hero.brand")}</p>
      </div>
    );

  const titleBlock =
    title ??
    (
      <h1 className="cb-pl-hero-title cb-hero-title mt-5 max-w-[min(100%,22rem)] text-balance font-serif text-[length:var(--fluid-display)] font-semibold leading-[1.06] sm:mt-6 sm:max-w-3xl lg:mt-7">
        Premium American-Style Cookies
        <span className="cb-hero-title-accent italic"> Freshly Baked</span>
        <br className="hidden sm:block" />
        <span className="mt-1 block sm:mt-0 sm:inline">with Belgian Chocolate</span>
      </h1>
    );

  const bodyBlock =
    body ??
    (
      <p className="cb-pl-hero-sub mt-6 max-w-xl text-pretty text-[length:var(--fluid-body)] font-medium leading-relaxed sm:mt-7 sm:text-lg lg:max-w-lg">
        Handcrafted cookies using premium Belgian chocolate, freshly baked for every order. Available across New Cairo and selected Cairo areas.
      </p>
    );

  const actionsBlock =
    actions ??
    (
      <div className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:max-w-none lg:justify-start">
        <Link
          href="/shop"
          className={buttonClassName(
            "primary",
            "cb-hero-cta-primary cb-touch-manipulation min-h-[3rem] w-full justify-center rounded-full px-7 py-3 text-base sm:w-auto",
          )}
        >
          <span className="text-center sm:text-nowrap">SHOP COOKIES</span>
          <ChevronRight
            className="cb-pl-chevron ms-0.5 h-5 w-5 shrink-0 rtl:rotate-180"
            aria-hidden
          />
        </Link>
        <Link
          href="/gift-box"
          className={cn(
            "cb-pl-btn-ghost cb-hero-cta-ghost cb-touch-manipulation min-h-[3rem] w-full justify-center sm:w-auto",
          )}
        >
          <span className="text-center sm:text-nowrap">SHOP GIFT BOXES</span>
        </Link>
      </div>
    );

  return (
    <div className="cb-hero-layout mx-auto w-full max-w-7xl cb-gutter">
      <div className="cb-hero-layout__grid">
        <div className="cb-hero-layout__copy relative mx-auto max-w-lg text-center lg:mx-0 lg:max-w-2xl lg:text-start">
          {kickerBlock}

          <HeroAnnouncement variant="inline" className="lg:hidden" />

          {titleBlock}
          {bodyBlock}
          {actionsBlock}

          <HeroTrustPills />

          <p className="cb-hero-location-note mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-cb-text-muted lg:justify-start">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--color-caramel)]" aria-hidden />
            <span>{t("hero.noteDesktop")}</span>
          </p>
        </div>

        <div className="cb-hero-layout__promo" aria-hidden={false}>
          <HeroVisual />
          <HeroAnnouncement variant="panel" className="hidden lg:block" />
        </div>
      </div>
    </div>
  );
}
