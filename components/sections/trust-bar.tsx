"use client";

import { Leaf, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { ViewReveal } from "@/components/motion/view-reveal";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "Premium ingredients",
    body: "Real butter, couverture chocolate, and no shortcuts.",
    icon: Leaf,
    accent: "from-cb-mint/35 to-transparent dark:from-cb-mint/25",
    reveal: "fade-up" as const,
  },
  {
    title: "Baked with love",
    body: "Small batches, careful timing, human eyes on every tray.",
    icon: Sparkles,
    accent: "from-cb-pink/40 to-transparent dark:from-cb-pink/25",
    reveal: "slide-left" as const,
  },
  {
    title: "Delivered fresh",
    body: "Packed the same day with insulated options in season.",
    icon: Truck,
    accent: "from-cb-peach to-transparent dark:from-cb-peach-deep/80",
    reveal: "zoom-soft" as const,
  },
  {
    title: "Trusted quality",
    body: "Consistent recipes, transparent sourcing, happy repeats.",
    icon: ShieldCheck,
    accent: "from-cb-mint/25 to-transparent dark:from-cb-mint/20",
    reveal: "tilt-up" as const,
  },
];

export function TrustBar() {
  return (
    <section className="relative border-y border-cb-peach-deep bg-cb-surface-2 py-12 md:py-16 dark:border-cb-border/50">
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
          {items.map((item, i) => (
            <ViewReveal
              key={item.title}
              variant={item.reveal}
              staggerIndex={i}
              className={cn(
                "relative flex gap-4",
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
              <div className="relative flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cb-peach-deep/80 bg-cb-cream/90 text-cb-terracotta-dark cb-shadow-editorial transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 dark:border-cb-border dark:bg-cb-surface-elevated dark:text-cb-terracotta">
                  <item.icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="font-semibold leading-snug text-cb-text-strong">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-cb-text-muted">
                    {item.body}
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
