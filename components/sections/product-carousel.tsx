"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ViewReveal } from "@/components/motion/view-reveal";
import type { Product } from "@/lib/data";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type ProductCarouselProps = {
  /** من الخادم — منتجات بشارة featured؛ إن فُرغ يُخفى الكاروسيل */
  products?: Product[];
};

export function ProductCarousel({ products = [] }: ProductCarouselProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const featured = products;
  const hasFeatured = featured.length > 0;

  const triple = hasFeatured
    ? [
        featured[index % featured.length],
        featured[(index + 1) % featured.length],
        featured[(index + 2) % featured.length],
      ]
    : [];

  const next = useCallback(() => {
    if (!hasFeatured) return;
    setIndex((i) => (i + 1) % featured.length);
  }, [hasFeatured, featured.length]);

  const prev = useCallback(() => {
    if (!hasFeatured) return;
    setIndex((i) => (i - 1 + featured.length) % featured.length);
  }, [hasFeatured, featured.length]);

  if (!hasFeatured) return null;

  return (
    <section className="cb-pl-bestsellers relative border-y border-[var(--color-border-soft)] bg-white py-16 md:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cb-terracotta-soft/40 to-transparent dark:via-cb-terracotta/25" />
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <div className="mb-12 flex flex-col items-center gap-8 lg:mb-14">
          <ViewReveal variant="tilt-up" className="mb-0 max-w-xl text-center">
            <SectionHeading
              align="center"
              variant="editorial"
              className="mb-0 max-w-xl text-center"
              eyebrow={t("carousel.eyebrow")}
              title={
                <>
                  {t("carousel.titleBefore")}
                  <span className="italic text-cb-terracotta-dark dark:text-cb-terracotta">
                    {t("carousel.titleAccent")}
                  </span>
                  {t("carousel.titleAfter")}
                </>
              }
              subtitle={t("carousel.subtitle")}
            />
          </ViewReveal>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={!hasFeatured}
              className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep text-cb-terracotta-dark transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-px hover:bg-cb-peach/70 hover:shadow-sm dark:border-cb-border dark:text-cb-terracotta dark:hover:bg-cb-peach/20"
              aria-label={t("actionsPrevNext.previous")}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!hasFeatured}
              className="cb-touch-manipulation flex h-11 w-11 items-center justify-center rounded-lg border border-cb-peach-deep text-cb-terracotta-dark transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:-translate-y-px hover:bg-cb-peach/70 hover:shadow-sm dark:border-cb-border dark:text-cb-terracotta dark:hover:bg-cb-peach/20"
              aria-label={t("actionsPrevNext.next")}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {triple.map((product, i) => (
              <motion.article
                key={`${product.id}-${index}-${i}`}
                layout
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{
                  duration: 0.42,
                  delay: i * 0.06,
                  ease: [0.33, 1, 0.68, 1],
                }}
                className={cn(
                  "overflow-hidden rounded-2xl border border-cb-peach-deep/80 bg-cb-cream cb-shadow-editorial cb-shadow-editorial-hover",
                  i === 1 && "lg:mt-8",
                  i === 2 && "lg:-mt-4",
                )}
              >
                <div className="relative aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width:1024px) 100vw, 25vw"
                  />
                </div>
                <div className="space-y-1 px-5 pb-6 pt-5 text-center">
                  <h3 className="font-serif text-lg font-semibold text-cb-text-strong">
                    {product.name}
                  </h3>
                  <p className="font-bold text-cb-terracotta-dark">
                    {product.price} EGP
                  </p>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cb-terracotta-dark/35 bg-gradient-to-br from-cb-mint/40 via-cb-cream to-cb-peach/50 p-8 text-center lg:min-h-[min(100%,22rem)]">
            <p className="font-serif text-2xl font-semibold leading-snug text-cb-text-strong">
              {t("carousel.sideTitle")}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-cb-text">
              {t("carousel.sideBody")}
            </p>
            <Link
              href="/shop"
              className={buttonClassName(
                "primary",
                "mt-8 justify-center text-white visited:text-white hover:text-white active:text-white cb-shadow-editorial-hover",
              )}
            >
              {t("carousel.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
