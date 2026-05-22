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
  borderless?: boolean;
  iconBoxClass?: string;
  invertBodyText?: boolean;
};

function StatCard({ title, value, sub, trend, icon: Icon, seed, accent, wrap, delay, borderless, iconBoxClass, invertBodyText }: Card) {
  const reduceMotion = useReducedMotion();
  const up = trend >= 0;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 shadow-sm",
        borderless ? "border-0" : "border",
        "bg-white dark:bg-cb-surface-elevated",
        wrap,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border border-cb-border/80 bg-cb-surface/80 text-amber-800 dark:text-amber-200",
            invertBodyText && !iconBoxClass && "border-white/25 bg-white/15 text-white",
            iconBoxClass,
          )}
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            invertBodyText
              ? up
                ? "bg-emerald-500/85 text-emerald-50"
                : "bg-rose-500/85 text-rose-50"
              : up
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
          )}
        >
          {up ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-[11px] font-bold uppercase tracking-wide",
          invertBodyText ? "text-white/90" : "text-stone-800 dark:text-stone-200",
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "mt-1 font-serif text-2xl font-bold tracking-tight",
          invertBodyText ? "text-white" : "text-stone-950 dark:text-white",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className={cn("mt-0.5 text-xs", invertBodyText ? "text-white/80" : "text-stone-700 dark:text-stone-300")}>{sub}</p>
      ) : null}
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
      wrap: "border-amber-300/80 bg-gradient-to-br from-cb-brand-500 to-cb-brand-600 dark:border-amber-900/40",
      delay: 0,
      invertBodyText: true,
    },
    {
      title: "قيد التجهيز",
      value: String(stats.processing),
      sub: "تحضير ودفع",
      trend: trendPct(stats.processing, stats.pending || 1),
      icon: Warehouse,
      seed: stats.processing + 5,
      accent: "#2563eb",
      wrap: "border-[rgba(138,216,255,0.4)] bg-[rgba(169,226,254,1)] dark:border-sky-900/40 dark:bg-sky-950/30",
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
      wrap: "border-violet-200/80 bg-violet-50/90 dark:border-violet-900/40 dark:bg-violet-950/30",
      delay: 0.08,
      borderless: true,
    },
    {
      title: "تم الشحن",
      value: String(stats.shipped),
      sub: "في الطريق للعميل",
      trend: trendPct(stats.shipped, stats.processing || 1),
      icon: Truck,
      seed: stats.shipped + 9,
      accent: "#0ea5e9",
      wrap: "border-cyan-200/80 bg-cyan-50/90 dark:border-cyan-900/40 dark:bg-cyan-950/30",
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
      wrap: "border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/30",
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
      wrap: "border-orange-200/80 bg-orange-50/90 dark:border-orange-900/40 dark:bg-orange-950/30",
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
      wrap: "border-red-200/80 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/30",
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
      wrap: "border-amber-200/80 bg-amber-50/95 dark:border-amber-900/40 dark:bg-amber-950/35",
      delay: 0.28,
      iconBoxClass: "border-amber-200 bg-amber-100 text-amber-800",
    },
  ];

  return (
    <div className="space-y-5">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "admin-hero-surface relative overflow-hidden rounded-2xl border border-cb-border/80 p-6 shadow-[var(--shadow-editorial)] sm:p-8",
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-amber-300/16 blur-3xl dark:bg-amber-900/15" aria-hidden />
        <div className="admin-panel-scrim" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.04, rotate: [-1.5, 1.5, 0] }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cb-border bg-white/90 text-amber-700 shadow-sm dark:bg-stone-900/80 dark:text-amber-300"
            >
              <Package className="h-7 w-7" aria-hidden />
            </motion.div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-cb-text-strong sm:text-3xl">
                Order Operations Board
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cb-text sm:text-[15px]">
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
