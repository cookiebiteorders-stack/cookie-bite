"use client";

import { Leaf, ShieldCheck, Sparkles, Truck, Gift, Heart } from "lucide-react";
import { ViewReveal } from "@/components/motion/view-reveal";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const itemDefs = [
  {
    titleKey: "trustBar.ingredientsTitle",
    bodyKey: "trustBar.ingredientsBody",
    icon: Leaf,
    accent: "from-cb-mint/35 to-transparent dark:from-cb-mint/25",
    reveal: "fade-up" as const,
  },
  {
    titleKey: "trustBar.bakedTitle",
    bodyKey: "trustBar.bakedBody",
    icon: Sparkles,
    accent: "from-cb-pink/40 to-transparent dark:from-cb-pink/25",
    reveal: "slide-left" as const,
  },
  {
    titleKey: "trustBar.deliveredTitle",
    bodyKey: "trustBar.deliveredBody",
    icon: Truck,
    accent: "from-cb-peach to-transparent dark:from-cb-peach-deep/80",
    reveal: "zoom-soft" as const,
  },
  {
    titleKey: "trustBar.qualityTitle",
    bodyKey: "trustBar.qualityBody",
    icon: ShieldCheck,
    accent: "from-cb-mint/25 to-transparent dark:from-cb-mint/20",
    reveal: "tilt-up" as const,
  },
  {
    titleKey: "trustBar.packagingTitle",
    bodyKey: "trustBar.packagingBody",
    icon: Gift,
    accent: "from-cb-terracotta/30 to-transparent dark:from-cb-terracotta/20",
    reveal: "fade-up" as const,
  },
  {
    titleKey: "trustBar.careTitle",
    bodyKey: "trustBar.careBody",
    icon: Heart,
    accent: "from-cb-pink/35 to-transparent dark:from-cb-pink/20",
    reveal: "slide-right" as const,
  },
];

export function TrustBar() {
  const { t } = useLanguage();

  return (
    <section className="cb-pl-trust relative py-12 md:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.4]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 15% 40%, rgba(217,245,232,0.35), transparent 55%), radial-gradient(ellipse 70% 50% at 92% 60%, rgba(245,217,217,0.28), transparent 50%)",
        }}
      />
      <div className="relative mx-auto max-w-7xl cb-gutter">
        <div className="grid gap-y-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-6">
          {itemDefs.map((item, i) => (
            <ViewReveal
              key={item.titleKey}
              variant={item.reveal}
              staggerIndex={i}
              className={cn(
                "relative flex justify-center",
                i === 1 && "sm:translate-y-1 lg:translate-y-3",
                i === 3 && "lg:-translate-y-2",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -inset-x-2 -inset-y-3 rounded-2xl bg-gradient-to-br opacity-70",
                  item.accent,
                )}
                aria-hidden
              />
              <div className="relative flex flex-col items-center gap-4 text-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-caramel)] shadow-[var(--shadow-pl-card)] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5">
                  <item.icon className="cb-pl-trust-icon h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold leading-snug text-cb-text-strong">
                    {t(item.titleKey)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-cb-text-muted">
                    {t(item.bodyKey)}
                  </p>
                </div>
              </div>
            </ViewReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
