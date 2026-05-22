"use client";

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type Props = {
  subtotalEgp: number;
  className?: string;
  variant?: "default" | "drawer";
};

export function FreeDeliveryBar({ subtotalEgp, className, variant = "default" }: Props) {
  const threshold = siteConfig.freeDeliveryThresholdEgp;
  const remaining = Math.max(0, threshold - subtotalEgp);
  const pct = threshold <= 0 ? 100 : Math.min(100, (subtotalEgp / threshold) * 100);

  if (subtotalEgp <= 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-cb-border px-4 py-3",
        variant === "drawer"
          ? "bg-cb-brand-50/80 ring-1 ring-cb-border/40"
          : "bg-cb-surface-2",
        className,
      )}
    >
      {remaining > 0 ? (
        <>
          <p className="text-sm font-semibold text-cb-text-strong">
            {remaining.toFixed(0)} EGP away from free delivery
          </p>
          <div
            className={cn(
              "mt-2 h-2.5 overflow-hidden rounded-full",
              variant === "drawer" ? "cb-cart-drawer__progress-track" : "bg-cb-brand-100",
            )}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                variant === "drawer" ? "cb-cart-drawer__progress-fill" : "bg-cb-brand-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-cb-text-muted">
            Free delivery on orders over {threshold} EGP
          </p>
        </>
      ) : (
        <p className="text-sm font-bold text-cb-brand-600">
          You unlocked free delivery
        </p>
      )}
    </div>
  );
}
