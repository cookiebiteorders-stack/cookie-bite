"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "motion/react";
import { SectionHeading } from "@/components/sections/section-heading";
import { ViewReveal } from "@/components/motion/view-reveal";
import { useLanguage } from "@/components/providers/language-provider";
import { duration, easeSoft, spring } from "@/lib/motion/presets";
import type { ExploreCategoryCard } from "@/lib/storefront/explore-category-types";
import { cn } from "@/lib/utils";

const cardVariants = ["fade-up", "slide-right", "zoom-soft", "tilt-up"] as const;

type ExploreCategoriesProps = {
  cards: ExploreCategoryCard[];
};

export function ExploreCategories({ cards }: ExploreCategoriesProps) {
  const { t, lang } = useLanguage();

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
        <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-6">
          {cards.map((card, i) => {
            const title = t(`explore.cards.${card.key}.title`);
            const subtitle = t(`explore.cards.${card.key}.subtitle`);
            const lead = i === 0;
            const wide = i === 3;
            const reveal = cardVariants[i % cardVariants.length];
            return (
              <ViewReveal
                key={card.key}
                variant={reveal}
                staggerIndex={i}
                className={cn(
                  lead && "sm:col-span-2 lg:col-span-2",
                  wide && "sm:col-span-2 lg:col-span-2",
                )}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={spring.soft}
                  className="h-full"
                >
                  <Link
                    href={card.href}
                    className="cb-pl-collection-card group relative block h-full overflow-hidden"
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
                        className="object-cover transition-transform duration-[680ms] ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:scale-[1.06]"
                        sizes={
                          lead || wide
                            ? "(max-width:1024px) 100vw, 66vw"
                            : "(max-width:1024px) 50vw, 33vw"
                        }
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5"
                        aria-hidden
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
                        <div className="max-w-[min(100%,22rem)]">
                          <p className="font-serif text-xl font-semibold leading-tight text-white sm:text-2xl">
                            {title}
                          </p>
                          <p className="mt-1.5 text-sm font-medium leading-snug text-white/85">
                            {subtitle}
                          </p>
                        </div>
                        <motion.span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white shadow-lg backdrop-blur-sm"
                          whileHover={{ scale: 1.08 }}
                          transition={{
                            duration: duration.short,
                            ease: easeSoft,
                          }}
                        >
                          <ArrowUpRight
                            className={cn(
                              "h-5 w-5",
                              lang === "ar" && "-scale-x-100",
                            )}
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
