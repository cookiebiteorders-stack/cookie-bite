"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewReveal } from "@/components/motion/view-reveal";
import { TESTIMONIALS } from "@/lib/data";
import { cn } from "@/lib/utils";

export function TestimonialSlider() {
  const [i, setI] = useState(0);
  const t = TESTIMONIALS[i];

  const next = useCallback(() => {
    setI((x) => (x + 1) % TESTIMONIALS.length);
  }, []);

  const prev = useCallback(() => {
    setI((x) => (x - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  return (
    <section className="relative bg-cb-peach/45 py-16 md:py-24 dark:bg-cb-peach/12">
      <div className="cb-grain pointer-events-none absolute inset-0 opacity-80 dark:opacity-50" />
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <div className="mb-10 flex flex-col items-center gap-3 md:mb-14">
          <ViewReveal variant="slide-left" className="max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cb-terracotta-dark dark:text-cb-terracotta">
              Voices, not widgets
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl">
              The kind of notes we{" "}
              <span className="italic text-cb-terracotta-dark dark:text-cb-terracotta">
                print out
              </span>
              .
            </h2>
          </ViewReveal>
          <div className="flex justify-center gap-2 md:pb-1">
            <button
              type="button"
              onClick={prev}
              className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep bg-cb-cream/80 text-cb-terracotta-dark transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-px hover:shadow-md dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-terracotta"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep bg-cb-cream/80 text-cb-terracotta-dark transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-px hover:shadow-md dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-terracotta"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20, rotate: -0.4 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: -16, rotate: 0.3 }}
              transition={{ duration: 0.45, ease: [0.33, 1, 0.68, 1] }}
              className="relative overflow-hidden rounded-2xl border border-cb-peach-deep bg-cb-surface cb-shadow-editorial"
            >
              <div
                className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-cb-mint via-cb-pink to-cb-terracotta-soft"
                aria-hidden
              />
              <Quote
                className="absolute right-6 top-6 h-14 w-14 text-cb-peach-deep/40"
                strokeWidth={1}
                aria-hidden
              />
              <div className="p-8 sm:p-10 sm:pl-12">
                <div
                  className="mb-6 flex gap-1 text-cb-terracotta-dark"
                  aria-label="Rated 5 out of 5"
                >
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-current" aria-hidden />
                  ))}
                </div>
                <p className="max-w-3xl font-serif text-xl leading-relaxed text-cb-text-strong sm:text-2xl sm:leading-snug">
                  “{t.quote}”
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-5 sm:gap-6">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-cb-text-strong ring-1 ring-cb-peach-deep/60 cb-shadow-editorial",
                      t.color,
                    )}
                    aria-hidden
                  >
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-cb-text-strong">
                      {t.name}
                    </p>
                    <p className="text-sm text-cb-text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
