"use client";

import { useState } from "react";
import { Percent, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { PriceAdjustMode, SmartBulkRule } from "@/lib/admin/products-inline-edit";
import { smartBulkRuleLabel } from "@/lib/admin/products-inline-edit";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  filteredTotal: number;
  selectedCount: number;
  onApplyPrice: (params: {
    mode: PriceAdjustMode;
    value: number;
    target: "selected" | "filtered";
  }) => void;
  onApplySmartRule: (rule: SmartBulkRule) => void;
};

export function ProductsBulkToolsPanel({
  disabled,
  filteredTotal,
  selectedCount,
  onApplyPrice,
  onApplySmartRule,
}: Props) {
  const [open, setOpen] = useState(false);
  const [priceValue, setPriceValue] = useState("10");
  const [priceTarget, setPriceTarget] = useState<"selected" | "filtered">("filtered");
  const [stockThreshold, setStockThreshold] = useState("10");

  const runPrice = (mode: PriceAdjustMode) => {
    const value = Number(priceValue);
    if (!Number.isFinite(value) || value <= 0) return;
    if (priceTarget === "selected" && selectedCount === 0) return;
    onApplyPrice({ mode, value, target: priceTarget });
  };

  return (
    <div className="rounded-2xl border border-cb-border/90 bg-white/90 p-3 shadow-sm dark:bg-cb-surface-elevated/90">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-sm font-bold text-cb-text-strong"
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" aria-hidden />
          أدوات Bulk متقدمة
        </span>
        <span className="text-xs font-semibold text-cb-text-muted">{open ? "إخفاء" : "عرض"}</span>
      </button>

      {open ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-cb-border bg-cb-surface p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">
              تعديل السعر
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                value={priceTarget}
                onChange={(e) => setPriceTarget(e.target.value as "selected" | "filtered")}
                className="rounded-lg border border-cb-border bg-cb-surface px-2 py-1.5 text-xs font-semibold"
                disabled={disabled}
              >
                <option value="filtered">كل النتائج المصفاة ({filteredTotal})</option>
                <option value="selected" disabled={selectedCount === 0}>
                  المحدد فقط ({selectedCount})
                </option>
              </select>
              <input
                type="number"
                min={0.01}
                step={1}
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                className="w-24 rounded-lg border border-cb-border px-2 py-1.5 text-xs font-semibold tabular-nums"
                disabled={disabled}
                aria-label="قيمة التعديل"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => runPrice("percent_add")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50",
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" /> +%
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => runPrice("percent_subtract")}
                className="inline-flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                <TrendingDown className="h-3.5 w-3.5" /> -%
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => runPrice("set_fixed")}
                className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
              >
                <Percent className="h-3.5 w-3.5" /> سعر ثابت
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-cb-border bg-cb-surface p-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">
              Smart Bulk (حسب الفلتر الحالي)
            </h4>
            <p className="mt-1 text-[11px] text-cb-text-muted">
              يُطبَّق على {filteredTotal} منتج مطابق للفلاتر — حتى 2000 صف.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold">
                مخزون &lt;
                <input
                  type="number"
                  min={1}
                  value={stockThreshold}
                  onChange={(e) => setStockThreshold(e.target.value)}
                  className="mx-1 w-14 rounded border border-cb-border px-1 py-0.5 text-xs tabular-nums"
                  disabled={disabled}
                />
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  const n = Number(stockThreshold);
                  if (!Number.isFinite(n) || n < 0) return;
                  onApplySmartRule({ type: "stock_below", threshold: Math.floor(n), action: "deactivate" });
                }}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900"
              >
                {smartBulkRuleLabel({
                  type: "stock_below",
                  threshold: Number(stockThreshold) || 10,
                  action: "deactivate",
                })}
              </button>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onApplySmartRule({ type: "out_of_stock", action: "deactivate" })}
              className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-900 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
            >
              إيقاف كل المنتجات نفاد المخزون (≤0)
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
