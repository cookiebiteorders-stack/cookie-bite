"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { HERO_FALLBACK_IMAGE, HERO_VIDEO_SRC } from "@/lib/site-media";
import { cn } from "@/lib/utils";

const TRUST_KEYS = [
  "hero.trust0",
  "hero.trust1",
  "hero.trust2",
  "hero.trust3",
  "hero.trust4",
  "hero.trust5",
  "hero.trust6",
  "hero.trust7",
] as const;

export function HeroSection5() {
  const { t } = useLanguage();
  const soft = [0.33, 1, 0.68, 1] as const;

  return (
    <div className="cb-pl-hero cb-grain overflow-x-hidden">
      <section className="relative min-h-[100svh] w-full">
        <div
          className="absolute inset-0 z-0 overflow-hidden bg-[var(--color-cream)]"
          aria-hidden
        >
          {HERO_VIDEO_SRC ? (
            <video
              muted
              playsInline
              autoPlay
              loop
              preload="auto"
              className="absolute inset-0 h-full w-full object-cover"
              src={HERO_VIDEO_SRC}
            />
          ) : (
            <Image
              src={HERO_FALLBACK_IMAGE}
              alt=""
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="pointer-events-none absolute inset-0 cb-pl-hero-overlay lg:hidden" />
          <div className="pointer-events-none absolute inset-0 cb-pl-hero-overlay hidden lg:block" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col cb-gutter pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(4.5rem,env(safe-area-inset-top))] md:pb-28 md:pt-24 lg:block lg:pb-36 lg:pt-28">
          <div className="relative mx-auto max-w-lg text-center lg:ms-4 lg:me-auto lg:max-w-2xl lg:text-start">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.7, ease: soft }}
              className="inline-flex rotate-[-0.8deg] flex-col gap-1"
            >
              <span className="cb-pl-hero-kicker text-[max(10px,0.65rem)] font-bold uppercase tracking-[0.22em] sm:tracking-[0.28em]">
                {t("hero.kicker")}
              </span>
              <span className="cb-pl-hero-kicker font-playful text-[clamp(1rem,3.5vw,1.35rem)] md:text-xl">
                {t("hero.brand")}
              </span>
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.75, ease: soft }}
              className="cb-pl-hero-title mt-6 max-w-[min(100%,22rem)] text-balance font-serif text-[length:var(--fluid-display)] font-semibold leading-[1.06] sm:mt-7 sm:max-w-3xl lg:mt-12"
            >
              {t("hero.titleBefore")}
              <span className="italic text-[var(--color-caramel)]">
                {t("hero.titleAccent")}
              </span>
              {t("hero.titleComma")}
              <br className="hidden sm:block" />
              <span className="mt-1 block sm:mt-0 sm:inline">
                {t("hero.titleLine2")}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.72, ease: soft }}
              className="cb-pl-hero-sub mt-6 max-w-xl text-pretty text-[length:var(--fluid-body)] font-medium leading-relaxed sm:mt-7 sm:text-lg lg:max-w-lg"
            >
              {t("hero.body")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.46, duration: 0.65, ease: soft }}
              className="mt-9 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-11 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4 lg:max-w-none lg:justify-start"
            >
              <Link
                href="/shop"
                className={buttonClassName(
                  "primary",
                  "cb-touch-manipulation min-h-[3rem] w-full justify-center rounded-full px-7 py-3 text-base sm:w-auto",
                )}
              >
                <span className="text-center sm:text-nowrap">{t("hero.ctaShop")}</span>
                <ChevronRight className="cb-pl-chevron ms-0.5 h-5 w-5 shrink-0 rtl:rotate-180" aria-hidden />
              </Link>
              <Link
                href="/our-cookies"
                className={cn(
                  "cb-pl-btn-ghost cb-touch-manipulation min-h-[3rem] w-full justify-center sm:w-auto",
                )}
              >
                <span className="text-center sm:text-nowrap">{t("hero.ctaDiscover")}</span>
              </Link>
            </motion.div>

            <p
              className={cn(
                "mt-10 hidden max-w-xs text-start text-xs leading-relaxed text-cb-text-muted lg:block",
                "border-s-2 border-cb-pink/80 ps-4",
              )}
            >
              {t("hero.noteDesktop")}
            </p>
          </div>
        </div>

        <section className="cb-pl-trust relative z-10 border-t border-[var(--color-border-soft)] bg-white py-5">
          <div className="relative m-auto max-w-7xl cb-gutter">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-10">
              <div className="shrink-0 md:max-w-[10.5rem] md:border-e md:border-cb-peach-deep md:pe-8">
                <p className="text-center font-serif text-base font-semibold italic text-cb-text-strong md:text-end">
                  {t("hero.proofTitle")}
                </p>
                <p className="mt-1 text-center text-[11px] font-medium uppercase tracking-wider text-cb-text-muted md:text-end">
                  {t("hero.proofSubtitle")}
                </p>
              </div>
              <div className="relative w-full py-1 md:w-[calc(100%-12rem)]">
                <InfiniteSlider gap={56} durationSec={60}>
                  {TRUST_KEYS.map((key) => (
                    <div
                      key={key}
                      className="flex shrink-0 items-center justify-center"
                    >
                      <span className="whitespace-nowrap font-serif text-base font-semibold text-cb-text sm:text-lg">
                        {t(key)}
                      </span>
                    </div>
                  ))}
                </InfiniteSlider>
                <div className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-r from-cb-cream to-transparent rtl:bg-gradient-to-l" />
                <div className="pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-l from-cb-cream to-transparent rtl:bg-gradient-to-r" />
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
