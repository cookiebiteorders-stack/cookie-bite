"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ViewReveal } from "@/components/motion/view-reveal";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import {
  STORY_NAMING_IDS,
  STORY_TIMELINE_IDS,
  STORY_VALUE_IDS,
} from "@/lib/content/our-story-structure";
import { IMAGES, INSTAGRAM_GRID } from "@/lib/data";
import { duration, easeSoft } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";
import "@/app/styles/our-story.css";

const NAMING_HREF: Record<(typeof STORY_NAMING_IDS)[number], string> = {
  classic: "/shop",
  playful: "/our-cookies",
  limited: "/collections/seasonal",
};

export function OurStoryClient() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  return (
    <div className="our-story-page">
      {/* §1 Hero */}
      <section className="our-story-hero relative min-h-[min(92vh,52rem)] overflow-hidden border-b border-cb-peach-deep/40">
        <div className="mx-auto grid max-w-7xl items-center gap-10 cb-gutter py-16 lg:min-h-[min(88vh,48rem)] lg:grid-cols-2 lg:py-20">
          <motion.div
            className="space-y-6 lg:py-8"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.page, ease: easeSoft, delay: 0.12 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--os-caramel)]">
              {t("pages.story.heroKicker")}
            </p>
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.08] text-cb-text-strong">
              {t("pages.story.heroTitle")}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-cb-text">
              {t("pages.story.heroBody")}
            </p>
            <Link
              href="/shop"
              className={cn(buttonClassName("primary"), "our-story-cta-primary min-h-12 rounded-full px-8")}
            >
              {t("pages.story.ctaShop")}
            </Link>
          </motion.div>

          <motion.div
            className="our-story-hero__img-wrap relative mx-auto aspect-[4/5] w-full max-w-lg overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-[var(--os-gold)]/40 lg:max-w-none"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: duration.cinematic, ease: easeSoft }}
          >
            <Image
              src={IMAGES.heroStack}
              alt={t("pages.story.heroImageAlt")}
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
              fetchPriority="high"
            />
          </motion.div>
        </div>
      </section>

      {/* §2 Origin */}
      <section className="mx-auto max-w-7xl cb-gutter py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <ViewReveal variant="slide-right">
            <blockquote className="our-story-quote text-xl sm:text-2xl">
              {t("pages.story.originQuote")}
            </blockquote>
            <p className="mt-8 text-lg leading-relaxed text-cb-text">
              {t("pages.story.originBody")}
            </p>
          </ViewReveal>
          <ViewReveal variant="slide-left" className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg ring-1 ring-cb-border">
            <Image
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80"
              alt={t("pages.story.originImageAlt")}
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </ViewReveal>
        </div>
        <div className="our-story-drip" aria-hidden />
      </section>

      {/* §3 Vision & Mission */}
      <section className="mx-auto max-w-7xl cb-gutter pb-20">
        <div className="grid gap-6 md:grid-cols-2">
          <ViewReveal staggerIndex={0} className="our-story-card--vision rounded-[2rem] p-8 sm:p-10">
            <span className="text-3xl" aria-hidden>
              🌍
            </span>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-cb-text-strong sm:text-3xl">
              {t("pages.story.visionTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-cb-text sm:text-lg">
              {t("pages.story.visionBody")}
            </p>
          </ViewReveal>
          <ViewReveal staggerIndex={1} className="our-story-card--mission rounded-[2rem] p-8 sm:p-10">
            <span className="text-3xl" aria-hidden>
              🍪
            </span>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-cb-text-strong sm:text-3xl">
              {t("pages.story.missionTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-cb-text sm:text-lg">
              {t("pages.story.missionBody")}
            </p>
          </ViewReveal>
        </div>
      </section>

      {/* §4 Core Values */}
      <section className="our-story-values py-20" aria-labelledby="story-values-heading">
        <div className="mx-auto max-w-7xl cb-gutter">
          <ViewReveal>
            <h2
              id="story-values-heading"
              className="font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl"
            >
              {t("pages.story.valuesTitle")}
            </h2>
          </ViewReveal>
          <div className="our-story-values__track mt-10" role="list">
            {STORY_VALUE_IDS.map((id, i) => (
              <ViewReveal
                key={id}
                staggerIndex={i}
                className="our-story-value-card rounded-2xl border border-cb-border/60 bg-cb-surface p-6 shadow-sm"
                role="listitem"
              >
                <span className="text-2xl" aria-hidden>
                  {t(`pages.story.values.${id}.icon`)}
                </span>
                <h3 className="mt-3 font-semibold text-cb-text-strong">
                  {t(`pages.story.values.${id}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cb-text">
                  {t(`pages.story.values.${id}.body`)}
                </p>
              </ViewReveal>
            ))}
          </div>
        </div>
      </section>

      {/* §5 Paradox */}
      <section className="our-story-paradox py-24 text-center">
        <div className="mx-auto max-w-4xl cb-gutter">
          <ViewReveal>
            <p className="font-serif text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-tight text-[var(--os-caramel)]">
              {t("pages.story.paradoxQuote")}
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-cb-text">
              {t("pages.story.paradoxBody")}
            </p>
          </ViewReveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <ViewReveal variant="zoom-soft" className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-md">
              <Image
                src={IMAGES.heroBox}
                alt={t("pages.story.paradoxImageGlamAlt")}
                fill
                className="object-cover"
                sizes="(max-width:640px) 100vw, 400px"
              />
            </ViewReveal>
            <ViewReveal variant="zoom-soft" staggerIndex={1} className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-md">
              <Image
                src="https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80"
                alt={t("pages.story.paradoxImageFunAlt")}
                fill
                className="object-cover"
                sizes="(max-width:640px) 100vw, 400px"
              />
            </ViewReveal>
          </div>
        </div>
      </section>

      {/* §6 Emotional experience */}
      <section className="mx-auto max-w-7xl cb-gutter py-20 lg:py-28">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <ViewReveal className="overflow-hidden rounded-3xl bg-cb-peach/30">
            <div className="grid min-h-[280px] grid-cols-2 grid-rows-2 gap-1 p-1 lg:min-h-[360px]">
              {INSTAGRAM_GRID.slice(0, 4).map((src) => (
                <div key={src} className="relative min-h-[8rem] overflow-hidden rounded-lg sm:min-h-[10rem]">
                  <Image src={src} alt="" fill className="object-cover" sizes="25vw" aria-hidden />
                </div>
              ))}
            </div>
          </ViewReveal>
          <ViewReveal variant="slide-right">
            <p className="font-serif text-2xl font-semibold leading-snug text-cb-text-strong sm:text-3xl">
              {t("pages.story.emotionalLine1")}
            </p>
            <p className="mt-4 font-serif text-xl text-[var(--os-caramel)] sm:text-2xl">
              {t("pages.story.emotionalLine2")}
            </p>
            <Link
              href="/shop"
              className={cn(
                buttonClassName("primary"),
                "our-story-cta-primary mt-8 inline-flex min-h-12 rounded-full px-8 transition hover:scale-[1.02]",
              )}
            >
              {t("pages.story.emotionalCta")}
            </Link>
          </ViewReveal>
        </div>
      </section>

      {/* §7 Timeline */}
      <section className="border-y border-cb-border/50 bg-cb-surface/50 py-20" aria-labelledby="story-timeline-heading">
        <div className="mx-auto max-w-7xl cb-gutter">
          <ViewReveal>
            <h2 id="story-timeline-heading" className="font-serif text-3xl font-semibold text-cb-text-strong">
              {t("pages.story.timelineTitle")}
            </h2>
          </ViewReveal>
          <ol className="our-story-timeline mt-10 space-y-4 lg:space-y-0">
            {STORY_TIMELINE_IDS.map((id, i) => (
              <ViewReveal
                key={id}
                staggerIndex={i}
                className="our-story-timeline__step rounded-2xl p-6"
              >
                <span className="text-2xl" aria-hidden>
                  {t(`pages.story.timeline.${id}.icon`)}
                </span>
                <h3 className="mt-3 font-semibold text-cb-text-strong">
                  {t(`pages.story.timeline.${id}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cb-text">
                  {t(`pages.story.timeline.${id}.body`)}
                </p>
              </ViewReveal>
            ))}
          </ol>
        </div>
      </section>

      {/* §8 Naming philosophy */}
      <section className="mx-auto max-w-7xl cb-gutter py-20" aria-labelledby="story-naming-heading">
        <ViewReveal>
          <h2 id="story-naming-heading" className="font-serif text-3xl font-semibold text-cb-text-strong">
            {t("pages.story.namingTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-cb-text">{t("pages.story.namingSubtitle")}</p>
        </ViewReveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STORY_NAMING_IDS.map((id, i) => (
            <ViewReveal key={id} staggerIndex={i}>
              <Link
                href={NAMING_HREF[id]}
                className="our-story-naming-tile block rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="font-serif text-xl font-semibold text-cb-text-strong">
                  {t(`pages.story.naming.${id}.title`)}
                </h3>
                <p className="mt-2 text-sm italic text-[var(--os-caramel)]">
                  {t(`pages.story.naming.${id}.examples`)}
                </p>
                <span className="mt-4 inline-block text-sm font-bold text-cb-terracotta-dark">
                  {t("pages.story.namingExplore")} →
                </span>
              </Link>
            </ViewReveal>
          ))}
        </div>
      </section>

      {/* §9 Closing */}
      <section className="bg-[var(--os-cream)] py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6 cb-gutter">
          <ViewReveal>
            <h2 className="font-serif text-[clamp(2rem,5vw,3rem)] font-bold text-cb-text-strong">
              {t("pages.story.closeHeadline")}
            </h2>
            <p className="text-xl font-medium text-[var(--os-gold)] sm:text-2xl">
              {t("pages.story.closeGold")}
            </p>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-cb-text">
              {t("pages.story.closeBody")}
            </p>
            <div className="relative mx-auto mt-10 aspect-[16/9] max-w-md overflow-hidden rounded-3xl shadow-lg">
              <Image
                src={IMAGES.giftBox}
                alt={t("pages.story.closeImageAlt")}
                fill
                className="object-cover"
                sizes="400px"
              />
            </div>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/shop"
                className={cn(
                  buttonClassName("primary"),
                  "our-story-cta-primary min-h-12 w-full rounded-full px-10 sm:w-auto",
                )}
              >
                {t("pages.story.shopNow")}
              </Link>
              <Link
                href="/our-cookies"
                className={cn(
                  buttonClassName("outline"),
                  "our-story-cta-outline min-h-12 w-full rounded-full px-10 sm:w-auto",
                )}
              >
                {t("pages.story.closeCtaMenu")}
              </Link>
            </div>
          </ViewReveal>
        </div>
      </section>
    </div>
  );
}
