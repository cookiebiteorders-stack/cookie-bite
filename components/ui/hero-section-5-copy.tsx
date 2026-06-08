"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { buttonClassName } from "@/components/ui/button";
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
      <p className="inline-flex rotate-[-0.8deg] flex-col gap-1">
        <span className="cb-pl-hero-kicker text-[max(10px,0.65rem)] font-bold uppercase tracking-[0.22em] sm:tracking-[0.28em]">
          {t("hero.kicker")}
        </span>
        <span className="cb-pl-hero-kicker font-playful text-[clamp(1rem,3.5vw,1.35rem)] md:text-xl">
          {t("hero.brand")}
        </span>
      </p>
    );

  const titleBlock =
    title ??
    (
      <h1 className="cb-pl-hero-title mt-6 max-w-[min(100%,22rem)] text-balance font-serif text-[length:var(--fluid-display)] font-semibold leading-[1.06] sm:mt-7 sm:max-w-3xl lg:mt-8">
        {t("hero.titleBefore")}
        <span className="italic text-[var(--color-caramel)]">{t("hero.titleAccent")}</span>
        {t("hero.titleComma")}
        <br className="hidden sm:block" />
        <span className="mt-1 block sm:mt-0 sm:inline">{t("hero.titleLine2")}</span>
      </h1>
    );

  const bodyBlock =
    body ??
    (
      <p className="cb-pl-hero-sub mt-6 max-w-xl text-pretty text-[length:var(--fluid-body)] font-medium leading-relaxed sm:mt-7 sm:text-lg lg:max-w-lg">
        {t("hero.body")}
      </p>
    );

  const actionsBlock =
    actions ??
    (
      <div className="mt-9 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-11 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:max-w-none lg:justify-start">
        <Link
          href="/shop"
          className={buttonClassName(
            "primary",
            "cb-touch-manipulation min-h-[3rem] w-full justify-center rounded-full px-7 py-3 text-base sm:w-auto",
          )}
        >
          <span className="text-center sm:text-nowrap">{t("hero.ctaShop")}</span>
          <ChevronRight
            className="cb-pl-chevron ms-0.5 h-5 w-5 shrink-0 rtl:rotate-180"
            aria-hidden
          />
        </Link>
        <Link
          href="/our-cookies"
          className={cn(
            "cb-pl-btn-ghost cb-touch-manipulation min-h-[3rem] w-full justify-center sm:w-auto",
          )}
        >
          <span className="text-center sm:text-nowrap">{t("hero.ctaDiscover")}</span>
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

          <p
            className={cn(
              "mt-10 hidden max-w-xs text-start text-xs leading-relaxed text-cb-text-muted lg:block",
              "border-s-2 border-cb-pink/80 ps-4",
            )}
          >
            {t("hero.noteDesktop")}
          </p>
        </div>

        <div className="cb-hero-layout__promo hidden lg:flex" aria-hidden={false}>
          <HeroAnnouncement variant="panel" />
        </div>
      </div>
    </div>
  );
}
