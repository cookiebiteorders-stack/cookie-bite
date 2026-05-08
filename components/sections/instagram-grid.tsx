"use client";

import Image from "next/image";
import { Instagram } from "lucide-react";
import { motion } from "motion/react";
import { INSTAGRAM_GRID, SITE } from "@/lib/data";
import { BRAND } from "@/lib/brand";
import { SectionHeading } from "@/components/sections/section-heading";
import { ViewReveal } from "@/components/motion/view-reveal";
import { buttonClassName } from "@/components/ui/button";
import { duration, easeSoft, spring } from "@/lib/motion/presets";
import { cn } from "@/lib/utils";

export function InstagramGrid() {
  return (
    <section className="relative bg-cb-cream py-16 md:py-24">
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <ViewReveal variant="fade-up" className="block">
          <SectionHeading
            variant="editorial"
            eyebrow="Behind the glass"
            title={
              <span>
                Crumbs, chaos, and quiet wins on{" "}
                <span className="text-cb-terracotta-dark dark:text-cb-terracotta">
                  {SITE.handle}
                </span>
              </span>
            }
            subtitle="A wall of imperfect squares — real batches, real light, the occasional thumbprint we didn’t edit out."
          />
        </ViewReveal>
        <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
          {INSTAGRAM_GRID.map((src, i) => (
            <motion.div
              key={src + i}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: duration.medium,
                ease: easeSoft,
                delay: (i % 6) * 0.05,
              }}
              className={cn(
                "relative mb-3 break-inside-avoid overflow-hidden rounded-2xl ring-1 ring-cb-peach-deep/50 sm:mb-4 dark:ring-cb-border/50",
                i % 4 === 1 && "sm:rotate-[0.6deg]",
                i % 4 === 3 && "sm:-rotate-[0.5deg]",
              )}
            >
              <motion.div
                className={cn(
                  "relative w-full overflow-hidden",
                  i % 3 === 0 ? "aspect-square" : "aspect-[5/6]",
                )}
                whileHover={{ scale: 1.02 }}
                transition={spring.soft}
              >
                <Image
                  src={src}
                  alt={`Cookie Bite gallery ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-[550ms] ease-[cubic-bezier(0.33,1,0.68,1)] hover:scale-[1.05]"
                  sizes="(max-width:768px) 50vw, 25vw"
                />
              </motion.div>
            </motion.div>
          ))}
        </div>
        <ViewReveal variant="zoom-soft" delay={0.12} className="mt-12 flex justify-center md:mt-14">
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
            See the day on Instagram
          </motion.a>
        </ViewReveal>
      </div>
    </section>
  );
}
