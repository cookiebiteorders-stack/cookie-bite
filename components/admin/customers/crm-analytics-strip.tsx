"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { PieChart, Target, Wallet } from "lucide-react";
import type { AdminCustomerRow } from "@/lib/admin/crm-types";
import type { CustomerStats } from "@/lib/admin/crm-types";
import { cn } from "@/lib/utils";

type Props = { customers: AdminCustomerRow[]; stats: CustomerStats };

export function CrmAnalyticsStrip({ customers, stats }: Props) {
  const reduceMotion = useReducedMotion();
  const repeatRate = useMemo(() => {
    if (customers.length === 0) return "—";
    const repeaters = customers.filter((c) => c.total_orders >= 2).length;
    return `${Math.round((repeaters / customers.length) * 100)}%`;
  }, [customers]);

  const topSpend = useMemo(() => {
    return [...customers].sort((a, b) => b.total_spent_egp - a.total_spent_egp).slice(0, 3);
  }, [customers]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid gap-3 rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4 shadow-sm backdrop-blur-md lg:grid-cols-3",
      )}
    >
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4 dark:bg-stone-900/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          <Wallet className="h-4 w-4 text-amber-600" aria-hidden />
          إيراد من الصفحة الحالية
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {topSpend.length === 0 ? (
            <li className="text-cb-text-muted">لا عملاء في الصفحة.</li>
          ) : (
            topSpend.map((c, i) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span className="truncate font-medium">
                  {i + 1}. {c.full_name ?? c.email}
                </span>
                <span className="shrink-0 font-mono text-xs text-cb-text-muted">
                  {c.total_spent_egp.toLocaleString("ar-EG")} ج.م
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4 dark:bg-stone-900/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          <PieChart className="h-4 w-4 text-violet-600" aria-hidden />
          معدل إعادة شراء (الصفحة)
        </div>
        <p className="mt-3 font-serif text-3xl font-bold text-stone-900 dark:text-stone-50">{repeatRate}</p>
        <p className="mt-1 text-xs text-cb-text-muted">نسبة عملاء بـ ≥ 2 طلبات ضمن النتائج المعروضة.</p>
      </div>
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4 dark:bg-stone-900/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          <Target className="h-4 w-4 text-sky-600" aria-hidden />
          تلميح AI
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-800 dark:text-stone-100">
          ركّز حملات الولاء على شريحة{" "}
          <strong className="text-amber-700 dark:text-amber-300">{stats.vip_gold_plus}</strong> عميلاً ذوي نقاط
          مرتفعة، وراقب شريحة <strong className="text-red-700 dark:text-red-300">{stats.at_risk_proxy}</strong>{" "}
          منخفضة النشاط.
        </p>
      </div>
    </motion.div>
  );
}
