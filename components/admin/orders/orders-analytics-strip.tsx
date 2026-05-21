"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BarChart3, Clock, Percent } from "lucide-react";
import type { AdminOrderRow } from "@/lib/admin/orders-operations-types";
import type { OrderStats } from "@/lib/admin/orders-operations-types";
import { cn } from "@/lib/utils";

type Props = {
  orders: AdminOrderRow[];
  stats: OrderStats;
};

export function OrdersAnalyticsStrip({ orders, stats }: Props) {
  const reduceMotion = useReducedMotion();
  const topSkus = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const key = o.order_code ?? o.id.slice(0, 8);
      map.set(key, (map.get(key) ?? 0) + Number(o.total_egp ?? 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [orders]);

  const refundRate = useMemo(() => {
    const denom = stats.delivered + stats.shipped + stats.returned + 1;
    return ((stats.returned / denom) * 100).toFixed(1);
  }, [stats]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid gap-3 rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4 shadow-sm backdrop-blur-md lg:grid-cols-3",
      )}
    >
      <div className="rounded-xl border border-cb-border/80 bg-[rgb(51,0,0)] p-4 dark:bg-[rgb(51,0,0)]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--caramel)]">
          <Clock className="h-4 w-4 text-amber-600" aria-hidden />
          طلبات الصفحة (قيمة)
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {topSkus.length === 0 ? (
            <li className="text-stone-300">لا بيانات في الصفحة الحالية.</li>
          ) : (
            topSkus.map(([code, v]) => (
              <li key={code} className="flex justify-between gap-2 text-sm text-stone-100">
                <span className="truncate font-mono text-xs">{code}</span>
                <span className="shrink-0 text-xs text-stone-300">{v.toLocaleString("ar-EG")} ج.م</span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-xl border-0 bg-transparent p-4 dark:bg-transparent">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          <Percent className="h-4 w-4 text-orange-600" aria-hidden />
          معدل مرتجعات تقريبي
        </div>
        <p className="mt-3 font-serif text-3xl font-bold text-stone-900 dark:text-stone-50">{refundRate}%</p>
        <p className="mt-1 text-xs text-cb-text-muted">مبني على refunded ÷ (delivered + shipped + refunded) عالمياً.</p>
      </div>
      <div className="rounded-xl border border-cb-border/80 bg-white/90 p-4 dark:bg-stone-900/40">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          <BarChart3 className="h-4 w-4 text-sky-600" aria-hidden />
          تدفق اليوم
        </div>
        <p className="mt-3 text-sm text-stone-800 dark:text-stone-100">
          طلبات جديدة اليوم: <strong>{stats.orders_today}</strong>
        </p>
        <p className="mt-1 text-sm text-stone-800 dark:text-stone-100">
          أمس: <strong>{stats.orders_yesterday}</strong>
        </p>
        <p className="mt-2 text-[11px] text-cb-text-muted">WebSockets غير مفعّل — استخدم «تحديث» أو التحديث التلقائي.</p>
      </div>
    </motion.div>
  );
}
