"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Award,
  Crown,
  Gem,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import type { CustomerStats } from "@/lib/admin/crm-types";
import { MiniSparkline } from "@/components/admin/products/mini-sparkline";
import { cn } from "@/lib/utils";

function fmtEgp(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toLocaleString("ar-EG")} ج.م`;
}

function trend(cur: number, base: number) {
  const b = base || 1;
  return Math.round(((cur - b) / b) * 100);
}

type Card = {
  title: string;
  value: string;
  sub?: string;
  trendPct: number;
  icon: typeof Users;
  seed: number;
  accent: string;
  wrap: string;
  delay: number;
};

function StatCard({ title, value, sub, trendPct, icon: Icon, seed, accent, wrap, delay }: Card) {
  const reduceMotion = useReducedMotion();
  const up = trendPct >= 0;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 shadow-sm",
        "bg-white dark:bg-cb-surface-elevated",
        wrap,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cb-border/80 bg-cb-surface/80 text-amber-800 dark:text-amber-200">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            up ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : "bg-rose-50 text-rose-800 dark:bg-transparent dark:text-rose-200",
          )}
        >
          {up ? "↑" : "↓"} {Math.abs(trendPct)}%
        </span>
      </div>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-stone-800 dark:text-stone-200">{title}</p>
      <p className="mt-1 font-serif text-2xl font-bold tracking-tight text-stone-950 dark:text-white">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-stone-700 dark:text-stone-300">{sub}</p> : null}
      <MiniSparkline seed={seed} color={accent} className="mt-2 h-9 w-full" />
    </motion.div>
  );
}

type Props = { stats: CustomerStats; online: boolean };

export function CrmHeroStats({ stats, online }: Props) {
  const reduceMotion = useReducedMotion();
  const churnShare = stats.total_customers
    ? Math.min(99, Math.round((stats.at_risk_proxy / stats.total_customers) * 100))
    : 0;

  const cards: Card[] = [
    {
      title: "عملاء جدد (30 يوم)",
      value: String(stats.new_signups_30d),
      sub: "تسجيلات حديثة",
      trendPct: trend(stats.new_signups_30d, Math.max(1, stats.total_customers - stats.new_signups_30d)),
      icon: Sparkles,
      seed: stats.new_signups_30d + 1,
      accent: "#ca8a04",
      wrap: "border-amber-200/80 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/35",
      delay: 0,
    },
    {
      title: "عملاء متكررون",
      value: String(stats.returning_with_orders),
      sub: "≥ طلبين (عينة طلبات)",
      trendPct: trend(stats.returning_with_orders, stats.total_customers || 1),
      icon: RefreshCw,
      seed: stats.returning_with_orders + 3,
      accent: "#2563eb",
      wrap: "border-sky-200/80 bg-sky-50/90 dark:border-sky-900/40 dark:bg-sky-950/35",
      delay: 0.04,
    },
    {
      title: "VIP / ذهبي+",
      value: String(stats.vip_gold_plus),
      sub: "نقاط ≥ 1500",
      trendPct: trend(stats.vip_gold_plus, stats.total_customers || 1),
      icon: Crown,
      seed: stats.vip_gold_plus + 7,
      accent: "#a855f7",
      wrap: "border-violet-200/80 bg-violet-50/90 dark:border-violet-900/40 dark:bg-violet-950/35",
      delay: 0.08,
    },
    {
      title: "معرضون للخطر",
      value: String(stats.at_risk_proxy),
      sub: "نقاط منخفضة + حساب قديم",
      trendPct: -churnShare,
      icon: AlertTriangle,
      seed: stats.at_risk_proxy + 11,
      accent: "#dc2626",
      wrap: "border-red-200/80 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/35",
      delay: 0.12,
    },
    {
      title: "احتمالية جمود (تقريب)",
      value: `${churnShare}%`,
      sub: "نسبة at-risk / الإجمالي",
      trendPct: -churnShare / 2,
      icon: AlertTriangle,
      seed: churnShare + 20,
      accent: "#ea580c",
      wrap: "border-orange-200/80 bg-orange-50/90 dark:border-orange-900/40 dark:bg-orange-950/35",
      delay: 0.16,
    },
    {
      title: "متوسط LTV (عينة)",
      value: fmtEgp(stats.avg_ltv_sample_egp),
      sub: "من طلبات مرتبطة بعملاء",
      trendPct: 8,
      icon: Gem,
      seed: Math.floor(stats.avg_ltv_sample_egp) + 2,
      accent: "#b45309",
      wrap: "border-amber-200/80 bg-amber-50/95 dark:border-amber-900/40 dark:bg-amber-950/38",
      delay: 0.2,
    },
    {
      title: "نشطون (90 يوم)",
      value: String(stats.active_last_90d),
      sub: "طلب خلال آخر 90 يوماً",
      trendPct: trend(stats.active_last_90d, stats.total_customers || 1),
      icon: TrendingUp,
      seed: stats.active_last_90d + 5,
      accent: "#059669",
      wrap: "border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-900/40 dark:bg-emerald-950/35",
      delay: 0.24,
    },
    {
      title: "أعضاء ولاء",
      value: String(stats.loyalty_members),
      sub: "نقاط &gt; 0",
      trendPct: trend(stats.loyalty_members, stats.total_customers || 1),
      icon: Award,
      seed: stats.loyalty_members + 9,
      accent: "#d97706",
      wrap: "border-amber-200/80 bg-amber-50/90 dark:border-amber-900/40 dark:bg-amber-950/35",
      delay: 0.28,
    },
  ];

  return (
    <div className="space-y-5">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "admin-hero-surface rounded-2xl p-6 shadow-[var(--shadow-editorial)] sm:p-8",
          "dark:to-violet-950/20",
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-16 h-52 w-52 rounded-full bg-violet-200/18 blur-3xl dark:bg-violet-900/15" aria-hidden />
        <div className="admin-panel-scrim" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <motion.div
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cb-border bg-white/90 text-amber-700 shadow-sm dark:bg-stone-900/80 dark:text-amber-300"
            >
              <Users className="h-7 w-7" aria-hidden />
            </motion.div>
            <div>
              <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
                Customer Management &amp; CRM
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-800 dark:text-stone-300 sm:text-[15px]">
                إدارة ملفات العملاء، الولاء، التجزئة، الاحتفاظ، التفاعل، وأتمتة دورة الحياة — لوحة CRM بمستوى SaaS مميز.
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
            {online ? "مزامنة البيانات" : "تحقق من الاتصال"}
          </div>
        </div>
      </motion.header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>
    </div>
  );
}
