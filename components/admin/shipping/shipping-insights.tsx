"use client";

import { motion, useReducedMotion } from "motion/react";
import { Clock, Coins, MapPin, Zap } from "lucide-react";
import type { ShippingZoneRow } from "@/lib/shipping/types";
import { cn } from "@/lib/utils";

type ShippingInsightsProps = {
  zones: ShippingZoneRow[];
};

function avgEta(zones: ShippingZoneRow[]) {
  const active = zones.filter((z) => z.is_active);
  if (!active.length) return "—";
  const mid = active.map((z) => (z.eta_min_days + z.eta_max_days) / 2);
  const v = mid.reduce((a, b) => a + b, 0) / mid.length;
  return `${v.toFixed(1)} d`;
}

function avgFee(zones: ShippingZoneRow[]) {
  const active = zones.filter((z) => z.is_active);
  if (!active.length) return "—";
  const v = active.reduce((a, z) => a + z.base_fee_egp, 0) / active.length;
  return `EGP ${v.toFixed(0)}`;
}

const cardBase =
  "rounded-2xl border p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5";

export function ShippingInsights({ zones }: ShippingInsightsProps) {
  const reduceMotion = useReducedMotion();
  const total = zones.length;
  const activeCount = zones.filter((z) => z.is_active).length;

  const items = [
    {
      label: "Total zones",
      value: String(total),
      icon: MapPin,
      className: "border-sky-200/80 bg-sky-50/80 text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100",
    },
    {
      label: "Active",
      value: String(activeCount),
      icon: Zap,
      className:
        "border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100",
    },
    {
      label: "Avg delivery (mid)",
      value: avgEta(zones),
      icon: Clock,
      className:
        "border-violet-200/80 bg-violet-50/80 text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100",
    },
    {
      label: "Avg base fee",
      value: avgFee(zones),
      icon: Coins,
      className:
        "border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.28 }}
          className={cn(cardBase, item.className)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">{item.label}</p>
            <item.icon className="h-4 w-4 opacity-70" aria-hidden />
          </div>
          <p className="mt-2 font-serif text-2xl font-bold tabular-nums">{item.value}</p>
        </motion.div>
      ))}
    </div>
  );
}
