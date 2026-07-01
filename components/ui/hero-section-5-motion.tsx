"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { HeroDecorations } from "@/components/ui/hero-decorations";
import { buttonClassName } from "@/components/ui/button";
import { HeroSection5Copy } from "@/components/ui/hero-section-5-copy";
import { useLanguage } from "@/components/providers/language-provider";
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

const soft = [0.33, 1, 0.68, 1] as const;

/** هيرو متحرك — ديسكتوب فقط (يُحمَّل ديناميكياً). */
export function HeroSection5Motion() {
  const { t } = useLanguage();

  return (
    <div className="cb-pl-hero-surface cb-grain overflow-x-hidden">
      <HeroDecorations />
      <section className="relative min-h-[100svh] w-full">
        <div className="relative z-10 flex min-h-[100svh] w-full flex-col pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(calc(4.5rem+var(--cb-announcement-offset,0px)),env(safe-area-inset-top))] md:pb-28 md:pt-[calc(6rem+var(--cb-announcement-offset,0px))] lg:pb-36 lg:pt-[calc(7rem+var(--cb-announcement-offset,0px))]">
          <HeroSection5Copy
            kicker={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.7, ease: soft }}
                className="cb-hero-kicker-wrap"
              >
                <p className="cb-hero-kicker-badge">{t("hero.kicker")}</p>
                <p className="cb-hero-brand-name font-playful">{t("hero.brand")}</p>
              </motion.div>
            }
            title={
              <motion.h1
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.75, ease: soft }}
                className="cb-pl-hero-title cb-hero-title mt-5 max-w-[min(100%,22rem)] text-balance font-serif text-[length:var(--fluid-display)] font-semibold leading-[1.06] sm:mt-6 sm:max-w-3xl lg:mt-7"
              >
                {t("hero.titleBefore")}
                <span className="cb-hero-title-accent italic">{t("hero.titleAccent")}</span>
                {t("hero.titleComma")}
                <br className="hidden sm:block" />
                <span className="mt-1 block sm:mt-0 sm:inline">{t("hero.titleLine2")}</span>
              </motion.h1>
            }
            body={
              <motion.p
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.72, ease: soft }}
                className="cb-pl-hero-sub mt-6 max-w-xl text-pretty text-[length:var(--fluid-body)] font-medium leading-relaxed sm:mt-7 sm:text-lg lg:max-w-lg"
              >
                {t("hero.body")}
              </motion.p>
            }
            actions={
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
                    "cb-hero-cta-primary cb-touch-manipulation min-h-[3rem] w-full justify-center rounded-full px-7 py-3 text-base sm:w-auto",
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
                    "cb-pl-btn-ghost cb-hero-cta-ghost cb-touch-manipulation min-h-[3rem] w-full justify-center sm:w-auto",
                  )}
                >
                  <span className="text-center sm:text-nowrap">{t("hero.ctaDiscover")}</span>
                </Link>
              </motion.div>
            }
          />
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
                    <div key={key} className="flex shrink-0 items-center justify-center">
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
