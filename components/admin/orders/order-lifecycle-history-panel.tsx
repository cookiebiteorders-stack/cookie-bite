"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, History } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type LifecycleEvent = {
  id: string;
  event_type: "created" | "deleted";
  order_id: string;
  order_ref: string | null;
  actor_email: string | null;
  created_at: string;
  expires_at: string;
  total_egp: number | null;
  items_count: number;
  invoices_count: number;
  payments_count: number;
};

type ApiResponse = {
  events: LifecycleEvent[];
  total: number;
  retention_days: number;
  note_ar: string;
};

export function OrderLifecycleHistoryPanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchJson<ApiResponse>(
        "/api/admin/orders/lifecycle-history?limit=20",
        { cache: "no-store" },
      );
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  return (
    <section className="rounded-2xl border border-cb-border/90 bg-white/90 shadow-sm dark:bg-cb-surface-elevated/90">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
          <History className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
          سجل الطلبات (إنشاء / حذف)
        </span>
        <span className="text-xs text-cb-text-muted">
          {open ? "إخفاء" : "عرض"} · يُحذف تلقائياً بعد 30 يوماً
        </span>
      </button>

      {open ? (
        <div className="border-t border-cb-border px-4 pb-4">
          <p className="mt-3 flex items-start gap-2 text-xs text-cb-text-muted">
            <Archive className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {data?.note_ar ??
              "السجل للقراءة فقط — لا يمكن حذفه يدوياً. عند حذف طلب تُزال فواتيره ومدفوعاته من النظام المالي."}
          </p>

          {loading ? (
            <p className="mt-4 text-sm text-cb-text-muted">جاري التحميل…</p>
          ) : !data?.events.length ? (
            <p className="mt-4 text-sm text-cb-text-muted">لا توجد أحداث في السجل بعد.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-start text-xs">
                <thead>
                  <tr className="border-b border-cb-border text-cb-text-muted">
                    <th className="py-2 pe-2 font-semibold">الحدث</th>
                    <th className="py-2 pe-2 font-semibold">الطلب</th>
                    <th className="py-2 pe-2 font-semibold">الإجمالي</th>
                    <th className="py-2 pe-2 font-semibold">مالية</th>
                    <th className="py-2 pe-2 font-semibold">بواسطة</th>
                    <th className="py-2 font-semibold">ينتهي</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((ev) => (
                    <tr key={ev.id} className="border-b border-cb-border/60">
                      <td className="py-2 pe-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 font-bold",
                            ev.event_type === "created"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-red-100 text-red-900",
                          )}
                        >
                          {ev.event_type === "created" ? "أُنشئ" : "حُذف"}
                        </span>
                      </td>
                      <td className="py-2 pe-2 font-mono">{ev.order_ref ?? ev.order_id.slice(0, 8)}</td>
                      <td className="py-2 pe-2 tabular-nums">
                        {ev.total_egp != null ? `${Number(ev.total_egp).toLocaleString("ar-EG")} ج.م` : "—"}
                      </td>
                      <td className="py-2 pe-2 text-cb-text-muted">
                        {ev.invoices_count} ف · {ev.payments_count} د
                      </td>
                      <td className="py-2 pe-2 truncate max-w-[140px]">{ev.actor_email ?? "—"}</td>
                      <td className="py-2 text-cb-text-muted">
                        {new Date(ev.expires_at).toLocaleDateString("ar-EG")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10px] text-cb-text-muted">
                إجمالي {data.total} حدثاً في السجل · الاحتفاظ {data.retention_days} يوماً
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
