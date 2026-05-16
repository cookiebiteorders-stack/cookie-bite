"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  Archive,
  Boxes,
  CircleDollarSign,
  Package,
  PackageOpen,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogStats } from "@/lib/admin/products-dashboard-types";
import { MiniSparkline } from "@/components/admin/products/mini-sparkline";

function fmtEgp(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("ar-EG")} ج.م`;
}

function pctChange(current: number, baseline: number) {
  if (baseline <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - baseline) / baseline) * 100);
}

type StatCardProps = {
  title: string;
  value: string;
  sub?: string;
  trendPct: number;
  icon: typeof Package;
  seed: number;
  accent: string;
  delay: number;
};

function StatCard({ title, value, sub, trendPct, icon: Icon, seed, accent, delay }: StatCardProps) {
  const reduceMotion = useReducedMotion();
  const up = trendPct >= 0;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-cb-border/80 bg-white/95 p-4 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(120,80,40,0.18)]",
        "dark:bg-cb-surface-elevated dark:shadow-[0_8px_28px_-14px_rgba(0,0,0,0.55)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-[rgb(61,36,24)] dark:text-amber-200"
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
          {up ? "↑" : "↓"} {Math.abs(trendPct)}%
        </span>
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[var(--caramel)]">{title}</p>
      <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-[var(--caramel)]">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--brown)]">{sub}</p> : null}
      <MiniSparkline seed={seed} color={accent} className="mt-2 h-9 w-full" />
    </motion.div>
  );
}

type Props = {
  stats: CatalogStats;
  online: boolean;
};

export function ProductsHeroAndStats({ stats, online }: Props) {
  const reduceMotion = useReducedMotion();
  const baseline = Math.max(1, stats.total - stats.active);

  const cards: StatCardProps[] = [
    {
      title: "إجمالي المنتجات",
      value: String(stats.total),
      sub: "في الكتالوج",
      trendPct: pctChange(stats.total, baseline + stats.draft),
      icon: Boxes,
      seed: stats.total + 11,
      accent: "#d97706",
      delay: 0,
    },
    {
      title: "نشط",
      value: String(stats.active),
      sub: "ظاهر للعملاء",
      trendPct: pctChange(stats.active, stats.draft + 1),
      icon: Package,
      seed: stats.active + 3,
      accent: "#059669",
      delay: 0.04,
    },
    {
      title: "نفاد المخزون",
      value: String(stats.out_of_stock),
      sub: "كمية ≤ 0",
      trendPct: stats.out_of_stock === 0 ? 2 : -pctChange(stats.out_of_stock, stats.active || 1),
      icon: PackageOpen,
      seed: stats.out_of_stock + 101,
      accent: "#dc2626",
      delay: 0.08,
    },
    {
      title: "مخزون منخفض",
      value: String(stats.low_stock),
      sub: "1–10 وحدات",
      trendPct: pctChange(stats.low_stock, Math.max(1, stats.active - stats.low_stock)),
      icon: Warehouse,
      seed: stats.low_stock + 7,
      accent: "#ea580c",
      delay: 0.12,
    },
    {
      title: "مسودات",
      value: String(stats.draft),
      sub: "غير منشورة",
      trendPct: -pctChange(stats.draft, stats.total || 1),
      icon: Archive,
      seed: stats.draft + 19,
      accent: "#78716c",
      delay: 0.16,
    },
    {
      title: "قيمة مخزون تقديرية",
      value: fmtEgp(stats.revenue_estimate_egp),
      sub: "Σ (سعر × كمية) للنشط",
      trendPct: pctChange(stats.revenue_estimate_egp, stats.revenue_estimate_egp * 0.92 + 1),
      icon: CircleDollarSign,
      seed: Math.floor(stats.revenue_estimate_egp) + 5,
      accent: "#b45309",
      delay: 0.2,
    },
  ];

  return (
    <div className="space-y-5">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "admin-hero-surface rounded-2xl p-6 shadow-[var(--shadow-editorial)] sm:p-8",
          "dark:border-amber-900/40",
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-16 h-56 w-56 rounded-full bg-orange-300/20 blur-3xl dark:bg-orange-900/20" aria-hidden />
        <div className="admin-panel-scrim" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.04, rotate: [-1.5, 1.5, 0] }}
              transition={{ type: "spring", stiffness: 380, damping: 18 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-white/90 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-stone-900/80 dark:text-amber-300"
            >
              <TrendingUp className="h-7 w-7" aria-hidden />
            </motion.div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-[var(--caramel)] sm:text-3xl">
                Product Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--brown)] sm:text-[15px]">
                إدارة الكتالوج، المتغيرات، التسعير، عتبات المخزون، حالة النشر، SEO، والتحليلات — لوحة
                تحكم على مستوى المؤسسات بتجربة مستخدم سلسة.
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
            {online ? "متصل" : "تحقق من الاتصال"}
          </div>
        </div>
      </motion.header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
}
