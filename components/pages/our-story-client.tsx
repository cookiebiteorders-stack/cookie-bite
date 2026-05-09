"use client";

import Image from "next/image";
import Link from "next/link";
import { STORY_SECTIONS } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export function OurStoryClient() {
  const { t } = useLanguage();

  const stats = [
    { titleKey: "pages.story.stats.happyTitle", bodyKey: "pages.story.stats.happyBody" },
    { titleKey: "pages.story.stats.batchTitle", bodyKey: "pages.story.stats.batchBody" },
    { titleKey: "pages.story.stats.realTitle", bodyKey: "pages.story.stats.realBody" },
    { titleKey: "pages.story.stats.giftTitle", bodyKey: "pages.story.stats.giftBody" },
  ] as const;

  return (
    <div className="bg-cb-cream">
      <section className="border-b border-cb-peach-deep">
        <div className="mx-auto grid max-w-7xl items-center gap-12 cb-gutter py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl lg:text-6xl">
              {t("pages.story.heroTitle")}
            </h1>
            <p className="text-lg text-cb-text">{t("pages.story.heroBody")}</p>
            <Link href="/shop" className={buttonClassName("primary", "w-fit px-8")}>
              {t("pages.story.ctaShop")}
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80"
              alt={t("pages.story.heroImageAlt")}
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
              fetchPriority="high"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-24 cb-gutter py-20">
        {STORY_SECTIONS.map((block) => (
          <section
            key={block.n}
            className="grid gap-10 lg:grid-cols-2 lg:items-center"
          >
            <div className={block.reverse ? "lg:order-2" : ""}>
              <p className="text-sm font-bold text-cb-terracotta-dark">{block.n}</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-cb-text-strong">
                {t(`pages.story.blocks.${block.n}.title`)}
              </h2>
              <p className="mt-4 text-lg text-cb-text">
                {t(`pages.story.blocks.${block.n}.body`)}
              </p>
            </div>
            <div
              className={`relative aspect-[4/3] overflow-hidden rounded-3xl shadow-lg ring-1 ring-cb-border ${
                block.reverse ? "lg:order-1" : ""
              }`}
            >
              <Image
                src={block.image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          </section>
        ))}
      </div>

      <section className="bg-cb-surface-elevated py-20">
        <div className="mx-auto max-w-7xl cb-gutter">
          <SectionHeading title={t("pages.story.whyTitle")} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.titleKey}
                className="rounded-3xl border border-cb-border bg-cb-cream p-6"
              >
                <h3 className="font-semibold text-cb-text-strong">{t(s.titleKey)}</h3>
                <p className="mt-2 text-sm text-cb-text">{t(s.bodyKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cb-peach/50 py-16 text-center">
        <div className="mx-auto max-w-2xl space-y-6 px-4">
          <h2 className="font-serif text-3xl font-semibold text-cb-text-strong">
            {t("pages.story.ctaTitle")}
          </h2>
          <p className="text-cb-text">{t("pages.story.ctaBody")}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/shop" className={buttonClassName("primary", "px-8")}>
              {t("pages.story.shopNow")}
            </Link>
            <Link href="/gift-box" className={buttonClassName("outline", "px-8")}>
              {t("pages.story.buildBox")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
