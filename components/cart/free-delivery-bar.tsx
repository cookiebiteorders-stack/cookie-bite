"use client";

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

type Props = {
  subtotalEgp: number;
  className?: string;
};

export function FreeDeliveryBar({ subtotalEgp, className }: Props) {
  const threshold = siteConfig.freeDeliveryThresholdEgp;
  const remaining = Math.max(0, threshold - subtotalEgp);
  const pct = threshold <= 0 ? 100 : Math.min(100, (subtotalEgp / threshold) * 100);

  if (subtotalEgp <= 0) return null;

  return (
    <div className={cn("rounded-2xl border border-cb-border bg-cb-surface-2 px-4 py-3", className)}>
      {remaining > 0 ? (
        <>
          <p className="text-sm font-semibold text-cb-text-strong">
            {remaining.toFixed(0)} EGP away from free delivery
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-cb-peach">
            <div
              className="h-full rounded-full bg-cb-terracotta-dark transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-cb-text-muted">
            Free delivery on orders over {threshold} EGP
          </p>
        </>
      ) : (
        <p className="text-sm font-bold text-cb-terracotta-dark">
          You unlocked free delivery
        </p>
      )}
    </div>
  );
}
