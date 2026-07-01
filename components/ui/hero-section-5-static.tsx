"use client";

import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { HeroDecorations } from "@/components/ui/hero-decorations";
import { HeroSection5Copy } from "@/components/ui/hero-section-5-copy";
import { useLanguage } from "@/components/providers/language-provider";

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

/** هيرو بدون motion — للموبايل و LCP أسرع. */
export function HeroSection5Static() {
  const { t } = useLanguage();

  return (
    <div className="cb-pl-hero-surface cb-grain overflow-x-hidden">
      <HeroDecorations />
      <section className="relative min-h-[100svh] w-full">
        <div className="relative z-10 flex min-h-[100svh] w-full flex-col pb-[max(4rem,env(safe-area-inset-bottom))] pt-[max(calc(4.5rem+var(--cb-announcement-offset,0px)),env(safe-area-inset-top))] md:pb-28 md:pt-[calc(6rem+var(--cb-announcement-offset,0px))] lg:pb-36 lg:pt-[calc(7rem+var(--cb-announcement-offset,0px))]">
          <HeroSection5Copy />
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
