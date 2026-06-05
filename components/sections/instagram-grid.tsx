"use client";

import Image from "next/image";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { SITE } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import type { InstagramFeedItem } from "@/lib/instagram/types";
import { SectionHeading } from "@/components/sections/section-heading";
import { ViewReveal } from "@/components/motion/view-reveal";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { duration, easeSoft } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

type Props = {
  items: InstagramFeedItem[];
};

export function InstagramGrid({ items }: Props) {
  const { t } = useLanguage();
  const hasInstagramPosts = items.some((item) => item.source === "instagram");
  const subtitle = hasInstagramPosts
    ? t("instagram.subtitleLive")
    : t("instagram.subtitle");

  return (
    <section className="cb-pl-instagram relative py-16 md:py-24">
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <ViewReveal variant="fade-up" className="block">
          <SectionHeading
            variant="editorial"
            eyebrow={t("instagram.eyebrow")}
            title={
              <span>
                {t("instagram.titleBefore")}
                <span className="text-[var(--caramel)]">{SITE.handle}</span>
              </span>
            }
            subtitle={subtitle}
          />
        </ViewReveal>

        {items.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:gap-4">
            {items.map((item, i) => (
              <motion.a
                key={item.id}
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: duration.medium,
                  ease: easeSoft,
                  delay: (i % 8) * 0.04,
                }}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl ring-1 ring-cb-peach-deep/45 sm:rounded-2xl dark:ring-cb-border/50",
                  i === 0 && "sm:col-span-2 sm:row-span-2",
                )}
                aria-label={t("instagram.openPost")}
              >
                <Image
                  src={item.imageUrl}
                  alt={t("instagram.galleryAlt", { n: i + 1 })}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes={
                    i === 0
                      ? "(max-width:640px) 50vw, 33vw"
                      : "(max-width:768px) 50vw, 25vw"
                  }
                  unoptimized={item.source === "instagram"}
                />
                <div
                  className="absolute inset-0 flex items-center justify-center bg-cb-chocolate/0 transition-colors duration-300 group-hover:bg-cb-chocolate/45"
                  aria-hidden
                >
                  <Instagram className="h-8 w-8 scale-75 text-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
                </div>
                {item.source === "catalog" ? (
                  <span className="absolute bottom-2 end-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {SITE.handle}
                  </span>
                ) : null}
              </motion.a>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-cb-peach-deep/60 bg-cb-cream/80 px-6 py-14 text-center">
            <p className="font-serif text-xl text-cb-text-strong">{t("instagram.empty")}</p>
          </div>
        )}

        <ViewReveal variant="zoom-soft" delay={0.12} className="mt-10 flex justify-center md:mt-12">
          <motion.a
            href={BRAND.social.instagram}
            target="_blank"
            rel="noreferrer"
            className={buttonClassName(
              "outline",
              "inline-flex items-center gap-2 px-8 transition-transform duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-0.5",
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Instagram className="h-4 w-4" />
            {t("instagram.cta")}
          </motion.a>
        </ViewReveal>
      </div>
    </section>
  );
}
