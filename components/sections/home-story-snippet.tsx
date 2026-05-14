"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { IMAGES } from "@/lib/data";
import { buttonClassName } from "@/components/ui/button";
import { ViewReveal } from "@/components/motion/view-reveal";
import { useLanguage } from "@/components/providers/language-provider";
import { duration, easeSoft, spring } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

export function HomeStorySnippet() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-cb-surface py-16 md:py-20 lg:py-24 dark:bg-cb-surface-2">
      <div
        className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-cb-pink/25 blur-3xl dark:bg-cb-pink/15"
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <ViewReveal
            variant="slide-right"
            className="relative lg:col-span-5 lg:col-start-1"
          >
            <div
              className={cn(
                "relative mx-auto aspect-[4/5] max-w-md lg:mx-0 lg:max-w-none",
                "rotate-[-1.2deg] lg:-translate-x-2",
              )}
            >
              <div
                className="absolute -bottom-4 -right-3 z-0 h-24 w-[85%] rounded-2xl bg-cb-mint/50 ring-1 ring-cb-peach-deep/60 dark:bg-cb-mint/25 dark:ring-cb-border"
                aria-hidden
              />
              <motion.div
                className="absolute inset-0 z-10 overflow-hidden rounded-2xl ring-1 ring-cb-peach-deep cb-shadow-editorial dark:ring-cb-border"
                whileHover={{ scale: 1.01, rotate: -0.4 }}
                transition={spring.soft}
              >
                <Image
                  src={IMAGES.storyMug}
                  alt={t("homeStory.imageAlt")}
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, 42vw"
                />
              </motion.div>
            </div>
          </ViewReveal>

          <div className="space-y-7 lg:col-span-6 lg:col-start-7 lg:pt-8">
            <ViewReveal variant="fade-up" delay={0.05}>
              <p className="inline-flex max-w-full flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cb-terracotta-dark dark:text-cb-terracotta">
                <span className="rounded-full bg-cb-peach/90 px-3 py-1 ring-1 ring-cb-peach-deep/50 dark:bg-cb-peach/25 dark:ring-cb-border">
                  {t("homeStory.badge")}
                </span>
                <span className="text-cb-text-muted">{t("homeStory.location")}</span>
              </p>
            </ViewReveal>
            <ViewReveal variant="slide-left" delay={0.1}>
              <h2 className="max-w-xl font-serif text-[2.1rem] font-semibold leading-[1.08] text-cb-text-strong sm:text-4xl lg:text-[2.65rem]">
                {t("homeStory.titleMain")}
                <span className="mt-2 block w-full text-[1.65rem] font-normal italic text-cb-terracotta-dark sm:text-3xl dark:text-cb-terracotta">
                  {t("homeStory.titleItalic")}
                </span>
              </h2>
            </ViewReveal>
            <ViewReveal variant="fade" delay={0.15}>
              <p className="max-w-lg text-base leading-relaxed text-cb-text sm:text-lg">
                {t("homeStory.body")}
              </p>
            </ViewReveal>
            <ViewReveal variant="fade-up" delay={0.2}>
              <motion.div
                whileHover={{ x: 4 }}
                transition={{ duration: duration.micro, ease: easeSoft }}
                className="w-fit"
              >
                <Link
                  href="/our-story"
                  className={buttonClassName(
                    "ghost",
                    "inline-flex w-fit items-center gap-2 border-b-2 border-cb-terracotta-dark/30 px-0 pb-1 text-cb-terracotta-dark hover:translate-x-0.5 hover:border-cb-terracotta-dark hover:bg-transparent dark:border-cb-terracotta/35 dark:text-cb-terracotta",
                  )}
                >
                  {t("homeStory.cta")}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </motion.div>
            </ViewReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
