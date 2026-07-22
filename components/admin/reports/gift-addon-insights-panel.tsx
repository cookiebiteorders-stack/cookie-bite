"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { buttonClassName } from "@/components/ui/button";

type Insights = {
  period_days: number;
  gift_boxes: {
    count: number;
    revenue_egp: number;
    by_size: { size: string; orders: number; revenue: number }[];
  };
  addons: { top: { name: string; count: number; revenue: number }[] };
};

export function GiftAddonInsightsPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson<Insights>("/api/admin/reports/gift-addon-insights?days=30");
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-panel-surface rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cb-terracotta-dark" />
          <h2 className="font-serif text-lg font-bold text-cb-text-strong">
            صناديق الهدايا والإضافات (30 يوم)
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className={buttonClassName("outline", "inline-flex items-center gap-1 text-xs")}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {loading && !data ? (
        <p className="mt-4 text-sm text-cb-text-muted">جاري التحميل…</p>
      ) : !data || !data.gift_boxes || !data.addons ? (
        <p className="mt-4 text-sm text-red-700">تعذر تحميل التقرير.</p>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
              صناديق مدفوعة
            </p>
            <p className="mt-1 text-2xl font-bold text-cb-text-strong">
              {data.gift_boxes.count}{" "}
              <span className="text-base font-normal text-cb-text-muted">
                · EGP {data.gift_boxes.revenue_egp.toLocaleString("en-EG")}
              </span>
            </p>
            <ul className="mt-3 space-y-2">
              {data.gift_boxes.by_size.map((row) => (
                <li
                  key={row.size}
                  className="flex justify-between rounded-lg bg-cb-cream/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{row.size}</span>
                  <span className="text-cb-text-muted">
                    {row.orders} طلب · EGP {Math.round(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-cb-text-muted">
              أكثر الإضافات طلباً
            </p>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {data.addons.top.length === 0 ? (
                <li className="text-sm text-cb-text-muted">لا بيانات إضافات في الفترة.</li>
              ) : (
                data.addons.top.map((row) => (
                  <li
                    key={row.name}
                    className="flex justify-between rounded-lg border border-cb-border/50 px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{row.name}</span>
                    <span className="shrink-0 ps-2 text-cb-text-muted">
                      ×{row.count}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
