"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Banknote,
  Box,
  Package,
  PackageCheck,
  RotateCcw,
  Truck,
  Warehouse,
} from "lucide-react";
import type { OrderStats } from "@/lib/admin/orders-operations-types";
import { MiniSparkline } from "@/components/admin/products/mini-sparkline";
import { cn } from "@/lib/utils";

function fmtEgp(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("ar-EG")} ج.م`;
}

function trendPct(today: number, yday: number) {
  const b = yday || 1;
  return Math.round(((today - b) / b) * 100);
}

type Card = {
  title: string;
  value: string;
  sub?: string;
  trend: number;
  icon: typeof Package;
  seed: number;
  accent: string;
  wrap: string;
  delay: number;
};

function StatCard({ title, value, sub, trend, icon: Icon, seed, accent, wrap, delay }: Card) {
  const reduceMotion = useReducedMotion();
  const up = trend >= 0;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm",
        "bg-white/95 dark:bg-cb-surface-elevated/95",
        wrap,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-cb-border/80 bg-cb-surface/80 text-amber-800 dark:text-amber-200"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            up ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
          )}
        >
          {up ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-cb-text-muted">{title}</p>
      <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-cb-text-muted">{sub}</p> : null}
      <MiniSparkline seed={seed} color={accent} className="mt-2 h-9 w-full" />
    </motion.div>
  );
}

type Props = {
  stats: OrderStats;
  online: boolean;
};

export function OrdersHeroStats({ stats, online }: Props) {
  const reduceMotion = useReducedMotion();
  const orderFlowTrend = trendPct(stats.orders_today, stats.orders_yesterday);

  const cards: Card[] = [
    {
      title: "قيد الانتظار",
      value: String(stats.pending),
      sub: "في قائمة المعالجة",
      trend: orderFlowTrend,
      icon: Package,
      seed: stats.pending + 2,
      accent: "#ca8a04",
      wrap: "border-amber-200/80 from-amber-50/80 to-white bg-gradient-to-br dark:border-amber-900/40 dark:from-amber-950/25",
      delay: 0,
    },
    {
      title: "قيد التجهيز",
      value: String(stats.processing),
      sub: "تحضير ودفع",
      trend: trendPct(stats.processing, stats.pending || 1),
      icon: Warehouse,
      seed: stats.processing + 5,
      accent: "#2563eb",
      wrap: "border-sky-200/80 from-sky-50/80 to-white bg-gradient-to-br dark:border-sky-900/40 dark:from-sky-950/25",
      delay: 0.04,
    },
    {
      title: "معبأ (Packed)",
      value: String(stats.packed),
      sub: "يتطلب عموداً مستقبلاً في DB",
      trend: 0,
      icon: Box,
      seed: 17,
      accent: "#7c3aed",
      wrap: "border-violet-200/80 from-violet-50/80 to-white bg-gradient-to-br dark:border-violet-900/40 dark:from-violet-950/25",
      delay: 0.08,
    },
    {
      title: "تم الشحن",
      value: String(stats.shipped),
      sub: "في الطريق للعميل",
      trend: trendPct(stats.shipped, stats.processing || 1),
      icon: Truck,
      seed: stats.shipped + 9,
      accent: "#0ea5e9",
      wrap: "border-cyan-200/80 from-cyan-50/80 to-white bg-gradient-to-br dark:border-cyan-900/40 dark:from-cyan-950/25",
      delay: 0.12,
    },
    {
      title: "تم التسليم",
      value: String(stats.delivered),
      sub: "مكتمل",
      trend: trendPct(stats.delivered, stats.shipped || 1),
      icon: PackageCheck,
      seed: stats.delivered + 3,
      accent: "#059669",
      wrap: "border-emerald-200/80 from-emerald-50/80 to-white bg-gradient-to-br dark:border-emerald-900/40 dark:from-emerald-950/25",
      delay: 0.16,
    },
    {
      title: "مرتجعات / مسترد",
      value: String(stats.returned),
      sub: "حالة refunded",
      trend: -trendPct(stats.returned, stats.delivered + stats.shipped + 1),
      icon: RotateCcw,
      seed: stats.returned + 11,
      accent: "#ea580c",
      wrap: "border-orange-200/80 from-orange-50/80 to-white bg-gradient-to-br dark:border-orange-900/40 dark:from-orange-950/25",
      delay: 0.2,
    },
    {
      title: "مدفوعات فاشلة",
      value: String(stats.failed_payments),
      sub: "تحتاج متابعة",
      trend: stats.failed_payments === 0 ? 2 : -8,
      icon: AlertCircle,
      seed: stats.failed_payments + 31,
      accent: "#dc2626",
      wrap: "border-red-200/80 from-red-50/80 to-white bg-gradient-to-br dark:border-red-900/40 dark:from-red-950/25",
      delay: 0.24,
    },
    {
      title: "إيراد اليوم (مدفوع)",
      value: fmtEgp(stats.revenue_today_egp),
      sub: "من طلبات paid اليوم",
      trend: orderFlowTrend,
      icon: Banknote,
      seed: Math.floor(stats.revenue_today_egp) + 7,
      accent: "#b45309",
      wrap: "border-amber-200/80 from-amber-50/90 to-white bg-gradient-to-br dark:border-amber-900/40 dark:from-amber-950/30",
      delay: 0.28,
    },
  ];

  return (
    <div className="space-y-5">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-cb-border/80 bg-gradient-to-br from-stone-50 via-white to-amber-50/50 p-6 shadow-[var(--shadow-editorial)] sm:p-8",
          "dark:from-stone-950 dark:via-cb-surface-elevated dark:to-amber-950/20",
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-900/15" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.04, rotate: [-1.5, 1.5, 0] }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cb-border bg-white/90 text-amber-700 shadow-sm dark:bg-stone-900/80 dark:text-amber-300"
            >
              <Package className="h-7 w-7" aria-hidden />
            </motion.div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
                Order Operations Board
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700 dark:text-stone-300 sm:text-[15px]">
                إدارة طابور الطلبات المباشر، المدفوعات، الشحن، التنفيذ، طلبات العملاء، والعمليات الجماعية — لوحة عمليات
                على مستوى المؤسسات.
              </p>
            </div>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
              online
                ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-amber-300/80 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", online ? "animate-pulse bg-emerald-500" : "bg-amber-500")} />
            {online ? "بث مباشر" : "وضع غير متصل"}
          </div>
        </div>
      </motion.header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
}
