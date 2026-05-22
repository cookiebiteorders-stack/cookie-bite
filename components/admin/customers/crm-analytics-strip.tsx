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
        "grid gap-3 rounded-2xl border border-cb-border/80 bg-white/95 p-4 shadow-sm backdrop-blur-md lg:grid-cols-3",
      )}
    >
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-600">
          <Wallet className="h-4 w-4 text-amber-700" aria-hidden />
          إيراد من الصفحة الحالية
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {topSpend.length === 0 ? (
            <li className="text-stone-600">لا عملاء في الصفحة.</li>
          ) : (
            topSpend.map((c, i) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span className="truncate font-medium text-stone-900">
                  {i + 1}. {c.full_name ?? c.email}
                </span>
                <span className="shrink-0 font-mono text-xs text-stone-600">
                  {c.total_spent_egp.toLocaleString("ar-EG")} ج.م
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-600">
          <PieChart className="h-4 w-4 text-violet-700" aria-hidden />
          معدل إعادة شراء (الصفحة)
        </div>
        <p className="mt-3 font-serif text-3xl font-bold text-stone-950">{repeatRate}</p>
        <p className="mt-1 text-xs text-stone-600">نسبة عملاء بـ ≥ 2 طلبات ضمن النتائج المعروضة.</p>
      </div>
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-600">
          <Target className="h-4 w-4 text-sky-700" aria-hidden />
          تلميح AI
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-800">
          ركّز حملات الولاء على شريحة{" "}
          <strong className="text-amber-800">{stats.vip_gold_plus}</strong> عميلاً ذوي نقاط مرتفعة، وراقب شريحة{" "}
          <strong className="text-red-800">{stats.at_risk_proxy}</strong> منخفضة النشاط.
        </p>
      </div>
    </motion.div>
  );
}
