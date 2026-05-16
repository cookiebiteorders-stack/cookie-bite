"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, BarChart3, Flame } from "lucide-react";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import { cn } from "@/lib/utils";

type Props = {
  products: AdminProductRow[];
};

export function ProductsAnalyticsStrip({ products }: Props) {
  const reduceMotion = useReducedMotion();
  const best = useMemo(() => {
    return [...products]
      .filter((p) => p.is_active && p.stock > 0)
      .sort((a, b) => b.price_egp * b.stock - a.price_egp * a.stock)
      .slice(0, 3);
  }, [products]);

  const lowAlerts = useMemo(() => {
    return products.filter((p) => p.is_active && p.stock > 0 && p.stock <= 10).slice(0, 4);
  }, [products]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid gap-3 rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4 shadow-sm backdrop-blur-md lg:grid-cols-2",
      )}
    >
      <div className="rounded-xl border-0 bg-[var(--brown)] p-4 text-right shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]">
        <div className="flex items-start gap-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
          <Flame className="h-4 w-4" aria-hidden />
          أعلى قيمة مخزون (الصفحة الحالية)
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {best.length === 0 ? (
            <li className="text-[var(--caramel)]">لا بيانات كافية في الصفحة الحالية.</li>
          ) : (
            best.map((p, i) => (
              <li key={p.id} className="flex justify-between gap-2 text-stone-800 dark:text-stone-100">
                <span className="truncate font-medium">
                  {i + 1}. {p.title_en ?? p.name}
                </span>
                <span className="shrink-0 text-xs text-cb-text-muted">
                  {(p.price_egp * p.stock).toLocaleString("ar-EG")} ج.م
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="rounded-xl border border-orange-100/80 bg-[rgb(61,36,24)] p-4 dark:border-orange-900/40">
        <div className="flex items-center gap-2 text-right text-xs font-bold uppercase tracking-wide text-orange-900 dark:text-orange-200">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          تنبيهات مخزون منخفض
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {lowAlerts.length === 0 ? (
            <li className="text-right text-[var(--caramel)]">لا منتجات منخفضة في هذه الصفحة.</li>
          ) : (
            lowAlerts.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span className="truncate text-stone-800 dark:text-stone-100">{p.title_en ?? p.name}</span>
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-900 dark:bg-orange-950/60 dark:text-orange-100">
                  {p.stock} متبقي
                </span>
              </li>
            ))
          )}
        </ul>
        <p className="mt-3 flex items-center justify-end gap-1 text-right text-[11px] text-[var(--caramel)]">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          مؤشرات سريعة من البيانات المحمّلة حالياً (مع التصفية والترقيم).
        </p>
      </div>
    </motion.div>
  );
}
