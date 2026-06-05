"use client";

import Image from "next/image";
import Link from "next/link";
import { Cake, Briefcase, PartyPopper, Gift, Snowflake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IMAGES } from "@/lib/data";
import type { Product } from "@/lib/data";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import {
  GIFT_OCCASION_CATEGORIES,
  resolveGiftOccasionHref,
  type GiftOccasionCategoryId,
} from "@/lib/gift-box/occasion-categories";
import type { OccasionTemplate } from "@/lib/occasion-templates/types";
import { cn } from "@/lib/utils";

const categoryIcons: Record<GiftOccasionCategoryId, LucideIcon> = {
  birthday: Cake,
  celebrations: PartyPopper,
  thanks: Gift,
  corporate: Briefcase,
  seasonal: Snowflake,
};

type GiftBoxClientProps = {
  giftProducts: Product[];
  occasionTemplates: OccasionTemplate[];
};

export function GiftBoxClient({ giftProducts, occasionTemplates }: GiftBoxClientProps) {
  const { t } = useLanguage();

  return (
    <>
      <section className="border-b border-cb-peach-deep bg-cb-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 cb-gutter py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <h1 className="font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl">
              {t("pages.giftBox.heroTitle")}
            </h1>
            <p className="text-lg text-cb-text">{t("pages.giftBox.heroBody")}</p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="#boxes"
                className={buttonClassName("primary", "rounded-full px-8")}
              >
                {t("pages.giftBox.exploreBoxes")}
              </Link>
              <Link
                href="/gift-box/build"
                className={buttonClassName("outline", "rounded-full px-8")}
              >
                {t("pages.giftBox.buildCustom")}
              </Link>
              <Link
                href="/mystery-box"
                className={buttonClassName("ghost", "rounded-full px-8")}
              >
                {t("pages.giftBox.mysteryBox")}
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-cb-border">
            <Image
              src={IMAGES.giftBox}
              alt={t("pages.giftBox.heroImageAlt")}
              fill
              className="object-cover"
              priority
              fetchPriority="high"
              sizes="(max-width:1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="bg-cb-surface py-14">
        <div className="mx-auto max-w-7xl cb-gutter">
          <SectionHeading
            title={t("pages.giftBox.findTitle")}
            subtitle={t("pages.giftBox.findSubtitle")}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {GIFT_OCCASION_CATEGORIES.map((category) => {
              const Icon = categoryIcons[category.id];
              const href = resolveGiftOccasionHref(category, occasionTemplates);
              return (
                <Link
                  key={category.id}
                  href={href}
                  className={cn(
                    "flex min-h-[48px] flex-col items-center gap-3 rounded-3xl border border-cb-peach-deep bg-cb-peach/60 p-6 text-center transition",
                    "hover:-translate-y-1 hover:border-cb-terracotta/40 hover:bg-cb-peach hover:shadow-md",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-terracotta focus-visible:ring-offset-2",
                  )}
                >
                  <Icon className="h-8 w-8 text-cb-terracotta-dark" aria-hidden />
                  <span className="text-sm font-bold text-cb-text-strong">
                    {t(category.translationKey)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="boxes" className="bg-cb-cream py-20">
        <div className="mx-auto max-w-7xl cb-gutter">
          <SectionHeading
            eyebrow={t("pages.giftBox.boxesEyebrow")}
            title={t("pages.giftBox.boxesTitle")}
            subtitle={t("pages.giftBox.boxesSubtitle")}
          />
          {giftProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {giftProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-cb-peach-deep bg-cb-surface p-10 text-center">
              <p className="text-cb-text">{t("pages.giftBox.emptyBoxes")}</p>
              <Link
                href="/gift-box/build"
                className={cn(buttonClassName("primary", "mt-6 rounded-full px-8"))}
              >
                {t("pages.giftBox.buildCustom")}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="bg-cb-surface py-14">
        <div className="mx-auto max-w-3xl cb-gutter text-center sm:text-start">
          <h2 className="font-serif text-2xl font-semibold text-cb-text-strong sm:text-3xl">
            {t("pages.giftBox.seoSectionTitle")}
          </h2>
          <p className="mt-4 text-cb-text leading-relaxed">{t("pages.giftBox.seoSectionBody")}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-semibold sm:justify-start">
            <li>
              <Link href="/gift-box/build" className="text-cb-terracotta-dark underline-offset-2 hover:underline">
                {t("pages.giftBox.seoLinkBuilder")}
              </Link>
            </li>
            <li>
              <Link href="/collections/gifts" className="text-cb-terracotta-dark underline-offset-2 hover:underline">
                {t("pages.giftBox.seoLinkCollection")}
              </Link>
            </li>
            <li>
              <Link href="/help/gifting" className="text-cb-terracotta-dark underline-offset-2 hover:underline">
                {t("pages.giftBox.seoLinkHelp")}
              </Link>
            </li>
            <li>
              <Link href="/corporate-gifting" className="text-cb-terracotta-dark underline-offset-2 hover:underline">
                {t("pages.giftBox.seoLinkCorporate")}
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-cb-peach/70 py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 cb-gutter text-center lg:flex-row lg:justify-between lg:text-start">
          <div className="relative h-48 w-full max-w-sm overflow-hidden rounded-3xl shadow-md ring-1 ring-cb-border lg:h-56">
            <Image
              src={IMAGES.heroStack}
              alt={t("pages.giftBox.stackedAlt")}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 384px"
            />
          </div>
          <div className="max-w-xl space-y-4">
            <h2 className="font-serif text-3xl font-semibold text-cb-text-strong">
              {t("pages.giftBox.corporateTitle")}
            </h2>
            <p className="text-cb-text">{t("pages.giftBox.corporateBody")}</p>
          </div>
          <Link
            href="/corporate-gifting"
            className={buttonClassName("primary", "whitespace-nowrap rounded-full px-8")}
          >
            {t("pages.giftBox.contactCorporate")}
          </Link>
        </div>
      </section>
    </>
  );
}
