"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { motion, useReducedMotion } from "motion/react";
import {
  Download,
  Printer,
  RefreshCw,
  Settings,
  ShoppingCart,
  Upload,
  Zap,
} from "lucide-react";
import { useOrdersOperationsStore } from "@/stores/orders-operations-store";
import { OrdersHeroStats } from "@/components/admin/orders/orders-hero-stats";
import { OrdersAnalyticsStrip } from "@/components/admin/orders/orders-analytics-strip";
import { OrdersMainWorkspace } from "@/components/admin/orders/orders-main-workspace";
import { OrderDetailsDrawer } from "@/components/admin/orders/order-details-drawer";
import { OrdersToasts } from "@/components/admin/orders/orders-toasts";
import { OrdersCommandPalette } from "@/components/admin/orders/orders-command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export function OrdersOperationsDashboard() {
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

  const stats = useOrdersOperationsStore((s) => s.stats);
  const online = useOrdersOperationsStore((s) => s.online);
  const loadOrders = useOrdersOperationsStore((s) => s.loadOrders);
  const orders = useOrdersOperationsStore((s) => s.orders);
  const pushToast = useOrdersOperationsStore((s) => s.pushToast);
  const setAdvancedFiltersOpen = useOrdersOperationsStore((s) => s.setAdvancedFiltersOpen);

  const page = useOrdersOperationsStore((s) => s.page);
  const search = useOrdersOperationsStore((s) => s.search);
  const statusFilter = useOrdersOperationsStore((s) => s.statusFilter);
  const paymentFilter = useOrdersOperationsStore((s) => s.paymentFilter);
  const dateFrom = useOrdersOperationsStore((s) => s.dateFrom);
  const dateTo = useOrdersOperationsStore((s) => s.dateTo);
  const totalMin = useOrdersOperationsStore((s) => s.totalMin);
  const totalMax = useOrdersOperationsStore((s) => s.totalMax);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openDetail = useCallback((id: string) => {
    setDetailId(id);
    setDetailOpen(true);
  }, []);

  const exportPage = useCallback(() => {
    const headers = ["id", "order_code", "guest_email", "total_egp", "status", "payment_status", "created_at"];
    const lines = [
      headers.join(","),
      ...orders.map((r) =>
        [
          r.id,
          r.order_code ?? "",
          `"${(r.guest_email ?? "").replace(/"/g, '""')}"`,
          r.total_egp,
          r.status,
          r.payment_status,
          r.created_at,
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-page-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("تم تصدير الصفحة الحالية.", "success");
  }, [orders, pushToast]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadOrders();
    });
    return cancel;
  }, [loadOrders, page, search, statusFilter, paymentFilter, dateFrom, dateTo, totalMin, totalMax]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadOrders();
    }, 90_000);
    return () => window.clearInterval(id);
  }, [loadOrders]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "/" && !typing && !detailOpen && !cmdkOpen) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailOpen, cmdkOpen]);

  const cycleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const meta = useOrdersOperationsStore((s) => s.meta);
  const canWrite = Boolean(meta?.can_write);

  return (
    <section className="relative space-y-6 pb-20">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "admin-panel-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm",
        )}
      >
        <div className="admin-panel-scrim" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-950 dark:text-sky-200/95">Operations</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-cb-text-strong sm:text-2xl">لوحة الطلبات</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-cb-text">
            Manage live order queues, payments, shipping, fulfillment, customer requests, and bulk workflows —{" "}
            <kbd className="rounded border px-1 font-mono text-[10px]">⌘K</kbd> أو{" "}
            <kbd className="rounded border px-1 font-mono text-[10px]">Ctrl+K</kbd> للأوامر،{" "}
            <kbd className="rounded border px-1 font-mono text-[10px]">/</kbd> للبحث. تحديث تلقائي كل 90 ثانية.
          </p>
        </div>
        <div className="w-full overflow-x-auto">
          <div className="flex min-w-max flex-nowrap items-center gap-2 pb-1">
            <button
            type="button"
            disabled
            title="غير متوفر حالياً — يتطلب تكامل نقطة بيع (POS)"
            aria-disabled="true"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition opacity-50"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              إنشاء طلب
            </button>
            <button
            type="button"
            onClick={exportPage}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-stone-900"
            >
              <Download className="h-4 w-4" aria-hidden />
              تصدير
            </button>
            <button
            type="button"
            disabled
            title="استيراد CSV غير مفعّل بعد"
            aria-disabled="true"
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm opacity-50 dark:bg-stone-900"
            >
              <Upload className="h-4 w-4" aria-hidden />
              استيراد
            </button>
            <button
            type="button"
            onClick={() => void loadOrders()}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-stone-900"
            >
              <Zap className="h-4 w-4" aria-hidden />
              مزامنة
            </button>
            <button
            type="button"
            disabled
            title="الطباعة الجماعية غير متوفرة بعد"
            aria-disabled="true"
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm opacity-50 dark:bg-stone-900"
            >
              <Printer className="h-4 w-4" aria-hidden />
              طباعة
            </button>
            <button
            type="button"
            onClick={() => void loadOrders()}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-stone-900"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              تحديث فوري
            </button>
            <div className="relative">
              <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-stone-900"
              aria-expanded={settingsOpen}
              >
                <Settings className="h-4 w-4" aria-hidden />
                سريع
              </button>
              {settingsOpen ? (
                <ul
                  className="absolute end-0 z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-xl"
                  onMouseLeave={() => setSettingsOpen(false)}
                  role="menu"
                >
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      onClick={() => {
                        setSettingsOpen(false);
                        pushToast("توليد ملصقات — اربط بشركة شحن", "info");
                      }}
                    >
                      توليد ملصقات
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      onClick={() => {
                        setSettingsOpen(false);
                        cycleTheme();
                      }}
                    >
                      تبديل المظهر
                    </button>
                  </li>
                </ul>
              ) : null}
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
        </div>
      </motion.div>

      <OrdersHeroStats stats={stats} online={online} />
      <OrdersAnalyticsStrip orders={orders} stats={stats} />
      <OrdersMainWorkspace searchInputRef={searchRef} onOpenDetail={openDetail} />

      <OrderDetailsDrawer
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailId(null);
        }}
        orderId={detailId}
        canWrite={canWrite}
      />

      <OrdersCommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onFocusSearch={() => searchRef.current?.focus()}
        onRefresh={() => void loadOrders()}
        onOpenAdvanced={() => setAdvancedFiltersOpen(true)}
        onExport={exportPage}
      />

      <OrdersToasts />
    </section>
  );
}
