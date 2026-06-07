"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, BarChart3, Eye, ShoppingCart, TrendingUp } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import { cn } from "@/lib/utils";

type AnalyticsRow = {
  product_id: string;
  views: number;
  units_sold: number;
  conversion_rate: number;
  product: { name: string; title_en: string | null; sku: string | null } | null;
};

type Props = {
  products: AdminProductRow[];
  productIds?: string[];
};

export function ProductsAnalyticsStrip({ products, productIds }: Props) {
  const reduceMotion = useReducedMotion();
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    const qs = new URLSearchParams({ days: "30", limit: "8" });
    if (productIds?.length) qs.set("product_ids", productIds.slice(0, 40).join(","));
    void fetchJson<{ rows: AnalyticsRow[] }>(`/api/admin/products/analytics?${qs}`, {
      cache: "no-store",
    })
      .then((res) => setRows(res.rows ?? []))
      .catch(() => setRows([]));
  }, [productIds]);

  const best = useMemo(() => {
    if (rows.length > 0) {
      return [...rows].sort((a, b) => b.views - a.views).slice(0, 3);
    }
    return products
      .filter((p) => p.is_active && p.stock > 0)
      .sort((a, b) => b.price_egp * b.stock - a.price_egp * a.stock)
      .slice(0, 3)
      .map((p) => ({
        product_id: p.id,
        views: 0,
        units_sold: 0,
        conversion_rate: 0,
        product: { name: p.name, title_en: p.title_en, sku: p.sku },
      }));
  }, [rows, products]);

  const lowAlerts = useMemo(() => {
    return products.filter((p) => p.is_active && p.stock > 0 && p.stock <= 10).slice(0, 4);
  }, [products]);

  const topConversion = useMemo(() => {
    return [...rows].filter((r) => r.views >= 5).sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
  }, [rows]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "grid gap-3 rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4 shadow-sm backdrop-blur-md lg:grid-cols-3",
      )}
    >
      <div className="rounded-xl border border-amber-200/20 bg-[var(--brown)] p-4 text-right shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]">
        <div className="flex items-start gap-2 text-xs font-bold uppercase tracking-wide text-amber-100">
          <Eye className="h-4 w-4" aria-hidden />
          الأكثر مشاهدة (30 يوم)
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {best.length === 0 ? (
            <li className="text-amber-100/90">لا بيانات بعد.</li>
          ) : (
            best.map((p, i) => (
              <li key={p.product_id} className="flex justify-between gap-2 text-stone-100">
                <span className="truncate font-medium">
                  {i + 1}. {p.product?.title_en ?? p.product?.name ?? "—"}
                </span>
                <span className="shrink-0 text-xs text-amber-100/90">
                  {p.views > 0 ? `${p.views} مشاهدة` : `${p.units_sold} مبيعات`}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-xl border border-emerald-100/30 bg-emerald-950/80 p-4">
        <div className="flex items-center gap-2 text-right text-xs font-bold uppercase tracking-wide text-emerald-100">
          <TrendingUp className="h-4 w-4" aria-hidden />
          أداء التحويل
        </div>
        {topConversion ? (
          <div className="mt-3 text-sm text-stone-100">
            <p className="font-semibold">{topConversion.product?.title_en ?? topConversion.product?.name}</p>
            <p className="mt-1 text-emerald-100/90">
              {topConversion.conversion_rate}% conversion · {topConversion.units_sold} مبيعات
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-emerald-100/80">لا توجد مشاهدات كافية بعد (≥5).</p>
        )}
        <p className="mt-3 flex items-center justify-end gap-1 text-[11px] text-emerald-100/80">
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden />
          من user_events + order_items
        </p>
      </div>

      <div className="rounded-xl border border-orange-100/80 bg-[rgb(61,36,24)] p-4 dark:border-orange-900/40">
        <div className="flex items-center gap-2 text-right text-xs font-bold uppercase tracking-wide text-orange-100">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          تنبيهات مخزون (الصفحة)
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {lowAlerts.length === 0 ? (
            <li className="text-right text-amber-100/90">لا منتجات منخفضة في هذه الصفحة.</li>
          ) : (
            lowAlerts.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span className="truncate text-stone-100">{p.title_en ?? p.name}</span>
                <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-900 dark:bg-orange-950/60 dark:text-orange-100">
                  {p.stock} متبقي
                </span>
              </li>
            ))
          )}
        </ul>
        <p className="mt-3 flex items-center justify-end gap-1 text-right text-[11px] text-amber-100/90">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          العتبة قابلة للتخصيص من قواعد الكتالوج.
        </p>
      </div>
    </motion.div>
  );
}
