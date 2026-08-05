"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewReveal } from "@/components/motion/view-reveal";
import type { PublicCustomerTestimonial } from "@/lib/testimonials/public-types";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  items: PublicCustomerTestimonial[];
};

export function TestimonialSlider({ items }: Props) {
  let t: (key: string) => string;
  try {
    const { t: tFn } = useLanguage();
    t = tFn;
  } catch {
    // Fallback if LanguageProvider is not available
    t = (key: string) => key;
  }

  const [i, setI] = useState(0);
  const hasItems = items.length > 0;
  const slide = hasItems ? items[i % items.length] : null;

  const next = useCallback(() => {
    if (!hasItems) return;
    setI((x) => (x + 1) % items.length);
  }, [hasItems, items.length]);

  const prev = useCallback(() => {
    if (!hasItems) return;
    setI((x) => (x - 1 + items.length) % items.length);
  }, [hasItems, items.length]);

  return (
    <section className="cb-pl-testimonials relative py-16 md:py-24">
      <div className="cb-grain pointer-events-none absolute inset-0 opacity-80 dark:opacity-50" />
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <div className="mb-10 flex flex-col items-center gap-3 md:mb-14">
          <ViewReveal variant="slide-left" className="max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cb-terracotta-dark dark:text-cb-terracotta">
              {t("testimonials.eyebrow")}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl">
              {t("testimonials.titleBefore")}
              <span className="italic text-cb-terracotta-dark dark:text-cb-terracotta">
                {t("testimonials.titleAccent")}
              </span>
              {t("testimonials.titleAfter")}
            </h2>
          </ViewReveal>
          {hasItems && items.length > 1 ? (
            <div className="flex justify-center gap-2 md:pb-1">
              <button
                type="button"
                onClick={prev}
                className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep bg-cb-cream/80 text-cb-terracotta-dark transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-px hover:shadow-md dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-terracotta"
                aria-label={t("actionsPrevNext.previous")}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={next}
                className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep bg-cb-cream/80 text-cb-terracotta-dark transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-px hover:shadow-md dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-terracotta"
                aria-label={t("actionsPrevNext.next")}
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative mx-auto max-w-5xl">
          <AnimatePresence mode="wait">
            {slide ? (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20, rotate: -0.4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -16, rotate: 0.3 }}
                transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
                className="relative overflow-hidden rounded-2xl border border-cb-peach-deep bg-cb-surface cb-shadow-editorial"
              >
                <div
                  className="absolute start-0 top-0 h-full w-1.5 bg-gradient-to-b from-cb-mint via-cb-pink to-cb-terracotta-soft"
                  aria-hidden
                />
                <Quote
                  className="absolute end-6 top-6 h-14 w-14 text-cb-peach-deep/40"
                  strokeWidth={1}
                  aria-hidden
                />
                <div className="p-8 sm:p-10 sm:ps-12">
                  <div
                    className="mb-6 flex gap-1 text-cb-terracotta-dark"
                    aria-label={t("testimonials.ratedStars")}
                  >
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star
                        key={k}
                        className={cn(
                          "h-4 w-4",
                          k < slide.rating ? "fill-current" : "fill-none opacity-35",
                        )}
                        aria-hidden
                      />
                    ))}
                  </div>
                  <p className="max-w-3xl font-serif text-xl leading-relaxed text-cb-text-strong sm:text-2xl sm:leading-snug">
                    &ldquo;{slide.comment}&rdquo;
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-5 sm:gap-6">
                    <div
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-cb-text-strong ring-1 ring-cb-peach-deep/60 cb-shadow-editorial",
                        slide.avatarColor,
                      )}
                      aria-hidden
                    >
                      {slide.authorInitial}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-cb-text-strong">
                        {slide.authorName}
                      </p>
                      <p className="text-sm text-cb-text-muted">{slide.authorMeta}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-dashed border-cb-peach-deep/70 bg-cb-surface/80 px-8 py-12 text-center cb-shadow-editorial"
              >
                <p className="font-serif text-xl text-cb-text-strong sm:text-2xl">
                  {t("testimonials.empty")}
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cb-text-muted">
                  {t("testimonials.emptyHint")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/account#feedback"
            className={buttonClassName("outline", "rounded-full px-6 py-2.5 text-sm")}
          >
            {t("testimonials.addCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
