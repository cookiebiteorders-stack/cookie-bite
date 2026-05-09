"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, Play } from "lucide-react";
import { IMAGES } from "@/lib/data";
import { buttonClassName } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-cb-peach-deep/40 bg-cb-cream">
      <div className="pointer-events-none absolute inset-0 flex justify-center">
        <span className="select-none font-serif text-[clamp(8rem,22vw,18rem)] font-bold leading-none text-cb-peach/40">
          CB
        </span>
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 cb-gutter py-10 lg:grid-cols-2 lg:gap-12 lg:py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 space-y-6"
        >
          <p className="font-serif text-lg font-semibold italic text-cb-terracotta-dark">
            A bite of happiness
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-cb-text-strong sm:text-4xl lg:text-5xl">
            Where every{" "}
            <span className="text-cb-terracotta-dark">bite</span> tells a story
          </h1>
          <p className="max-w-xl text-base text-cb-text lg:text-lg">
            Handcrafted luxury cookies, delivered fresh in New Cairo — baked in
            small batches with real butter, Belgian chocolate, and a little
            extra love.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/gift-box"
              className={buttonClassName("primary", "rounded-full px-8")}
            >
              Build your box
            </Link>
            <Link
              href="/our-story"
              className={buttonClassName(
                "outline",
                "rounded-full px-8 inline-flex items-center gap-2",
              )}
            >
              Shop our story
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-white bg-cb-peach"
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-cb-text">
              10K+ happy cookie lovers
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="relative z-10"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl ring-1 ring-cb-peach-deep/30">
            <Image
              src={IMAGES.heroBox}
              alt="صندوق كوكيز فاخر"
              fill
              priority
              fetchPriority="high"
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(28,14,6,0.46)] via-[rgba(28,14,6,0.14)] to-transparent dark:from-[rgba(0,0,0,0.62)] dark:via-[rgba(0,0,0,0.24)] dark:to-transparent"
              aria-hidden
            />
            <button
              type="button"
              className="absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-cb-surface/95 px-4 py-2 text-sm font-bold text-cb-text-strong shadow-lg ring-1 ring-cb-border backdrop-blur hover:bg-cb-cream dark:bg-cb-surface-elevated/92"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cb-terracotta-dark text-white">
                <Play className="h-4 w-4 fill-current" aria-hidden />
              </span>
              Watch our story
            </button>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 flex justify-center pb-4 text-xs font-bold uppercase tracking-[0.3em] text-cb-text">
        <span className="flex flex-col items-center gap-2">
          Scroll
          <span
            className="block h-8 w-px bg-gradient-to-b from-cb-terracotta-dark to-transparent"
            aria-hidden
          />
        </span>
      </div>
    </section>
  );
}
