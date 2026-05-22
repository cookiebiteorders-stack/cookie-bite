"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { CATEGORY_CARDS } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { ViewReveal } from "@/components/motion/view-reveal";
import { useLanguage } from "@/components/providers/language-provider";
import { duration, easeSoft, spring } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

const cardVariants = ["fade-up", "slide-right", "zoom-soft", "tilt-up"] as const;

/** ترتيب يطابق `CATEGORY_CARDS` في `lib/data` */
const EXPLORE_CARD_KEYS = ["classic", "seasonal", "gifts", "bites"] as const;

export function ExploreCategories() {
  const { t } = useLanguage();

  return (
    <section className="cb-pl-collections cb-grain relative py-16 md:py-24 lg:py-28">
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <ViewReveal variant="fade" className="block">
          <SectionHeading
            variant="editorial"
            eyebrow={t("explore.eyebrow")}
            title={t("explore.title")}
            subtitle={t("explore.subtitle")}
          />
        </ViewReveal>
        <div className="grid auto-rows-auto gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6">
          {CATEGORY_CARDS.map((card, i) => {
            const cardKey = EXPLORE_CARD_KEYS[i];
            const title = t(`explore.cards.${cardKey}.title`);
            const subtitle = t(`explore.cards.${cardKey}.subtitle`);
            const lead = i === 0;
            const wide = i === 3;
            const reveal = cardVariants[i % cardVariants.length];
            return (
              <ViewReveal
                key={card.href}
                variant={reveal}
                staggerIndex={i}
                className={cn(
                  lead && "sm:col-span-2 lg:col-span-2",
                  wide && "sm:col-span-2 lg:col-span-2",
                  i === 1 && "lg:-translate-y-2",
                  i === 2 && "lg:translate-y-4",
                )}
              >
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={spring.soft}
                  className="h-full"
                >
                  <Link
                    href={card.href}
                    className={cn(
                      "cb-pl-collection-card group relative block h-full overflow-hidden",
                    )}
                  >
                    <div
                      className={cn(
                        "relative w-full overflow-hidden",
                        lead && "aspect-[20/11] sm:aspect-[21/9]",
                        wide && "aspect-[20/11] sm:aspect-[2/1]",
                        !lead && !wide && "aspect-[4/5]",
                      )}
                    >
                      <Image
                        src={card.image}
                        alt={title}
                        fill
                        className="object-cover transition-transform duration-[680ms] ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-[1.05]"
                        sizes={
                          lead || wide
                            ? "(max-width:1024px) 100vw, 66vw"
                            : "(max-width:1024px) 50vw, 33vw"
                        }
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-cream)]/90 via-transparent to-transparent"
                        aria-hidden
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-[color:var(--color-cream)]/95 via-[color:var(--color-cream)]/75 to-transparent p-5 sm:p-6">
                        <div className="max-w-[min(100%,20rem)]">
                          <p className="font-serif text-xl font-semibold leading-tight text-[var(--color-text-primary)] sm:text-2xl">
                            {title}
                          </p>
                          <p className="mt-1.5 text-sm font-medium leading-snug text-[var(--color-text-secondary)]">
                            {subtitle}
                          </p>
                        </div>
                        <motion.span
                          className="flex h-11 w-11 shrink-0 rotate-3 items-center justify-center rounded-xl border border-white/35 bg-white/95 shadow-md dark:bg-cb-surface-elevated/95"
                          whileHover={{ rotate: 0, scale: 1.06 }}
                          transition={{
                            duration: duration.short,
                            ease: easeSoft,
                          }}
                        >
                          <ArrowUpRight
                            className="h-5 w-5 text-[var(--caramel)]"
                            aria-hidden
                          />
                        </motion.span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </ViewReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
