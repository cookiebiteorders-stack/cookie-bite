"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { motion, useReducedMotion } from "motion/react";
import { Printer, RefreshCw, Settings, ShoppingCart, Zap } from "lucide-react";
import { useOrdersOperationsStore } from "@/stores/orders-operations-store";
import { OrdersHeroStats } from "@/components/admin/orders/orders-hero-stats";
import { OrdersAnalyticsStrip } from "@/components/admin/orders/orders-analytics-strip";
import { OrdersMainWorkspace } from "@/components/admin/orders/orders-main-workspace";
import { OrderDetailsDrawer } from "@/components/admin/orders/order-details-drawer";
import { OrdersToasts } from "@/components/admin/orders/orders-toasts";
import { OrdersCommandPalette } from "@/components/admin/orders/orders-command-palette";
import { OrderLifecycleHistoryPanel } from "@/components/admin/orders/order-lifecycle-history-panel";
import { ImportExportToolbar } from "@/components/admin/import-export/import-export-toolbar";
import { printOrdersList } from "@/lib/admin/orders-print-html";
import { useImportExport } from "@/hooks/use-import-export";
import { cn } from "@/lib/utils";

export function OrdersOperationsDashboard() {
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
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

  const selectedIds = useOrdersOperationsStore((s) => s.selectedIds);
  const { downloadExport } = useImportExport("orders");

  const exportQuick = useCallback(async () => {
    const ids = Array.from(selectedIds);
    try {
      await downloadExport({
        format: "csv",
        scope: ids.length > 0 ? "selected" : "filtered",
        ids: ids.length > 0 ? ids : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      pushToast("تم التصدير.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "فشل التصدير", "error");
    }
  }, [selectedIds, downloadExport, dateFrom, dateTo, pushToast]);

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

  const printOrders = useCallback(() => {
    const toPrint =
      selectedIds.size > 0 ? orders.filter((o) => selectedIds.has(o.id)) : orders;
    if (!toPrint.length) {
      pushToast("لا توجد طلبات للطباعة.", "error");
      return;
    }
    const ok = printOrdersList(toPrint, {
      subtitle:
        selectedIds.size > 0
          ? `طباعة ${toPrint.length} طلب محدد`
          : `طباعة الصفحة الحالية (${toPrint.length} طلب)`,
    });
    if (!ok) {
      pushToast("تعذّر فتح نافذة الطباعة — تحقق من حاصر النوافذ المنبثقة.", "error");
    }
  }, [orders, selectedIds, pushToast]);

  const meta = useOrdersOperationsStore((s) => s.meta);
  const canWrite = Boolean(meta?.can_write);
  const canDelete = Boolean(meta?.can_delete);
  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return (
    <section className="relative space-y-6 pb-20">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "admin-panel-surface flex min-w-0 max-w-full flex-col gap-4 rounded-2xl p-5 shadow-sm",
        )}
      >
        <div className="admin-panel-scrim" aria-hidden />
        <div className="min-w-0 max-w-full flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-950 dark:text-sky-200/95">Operations</p>
          <h2 className="mt-1 font-serif text-xl font-bold text-cb-text-strong sm:text-2xl">لوحة الطلبات</h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-cb-text">
            Manage live order queues, payments, shipping, fulfillment, customer requests, and bulk workflows —{" "}
            <kbd className="rounded border px-1 font-mono text-[10px]">⌘K</kbd> أو{" "}
            <kbd className="rounded border px-1 font-mono text-[10px]">Ctrl+K</kbd> للأوامر،{" "}
            <kbd className="rounded border px-1 font-mono text-[10px]">/</kbd> للبحث. تحديث تلقائي كل 90 ثانية.
          </p>
        </div>
        <div className="w-full min-w-0 max-w-full">
          <div className="admin-toolbar-actions flex flex-wrap items-center gap-2">
            <Link
              href="/admin/orders/new"
              aria-disabled={!canWrite}
              className={cn(
                "admin-btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold sm:w-auto sm:justify-start",
                !canWrite && "pointer-events-none opacity-50",
              )}
            >
              <ShoppingCart className="h-4 w-4" aria-hidden />
              إنشاء طلب
            </Link>
            <ImportExportToolbar
              module="orders"
              canWrite={canWrite}
              selectedIds={selectedIdList}
              showHistory={false}
              className="contents"
              buttonClassName="admin-btn-outline inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
              onImportSuccess={() => void loadOrders()}
            />
            <button
            type="button"
            onClick={() => void loadOrders()}
            className="admin-btn-outline inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <Zap className="h-4 w-4" aria-hidden />
              مزامنة
            </button>
            <button
            type="button"
            onClick={printOrders}
            title="طباعة جدول الطلبات (المحدد أو الصفحة الحالية)"
            className="admin-btn-outline inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <Printer className="h-4 w-4" aria-hidden />
              طباعة
            </button>
            <button
            type="button"
            onClick={() => void loadOrders()}
            className="admin-btn-outline inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              تحديث فوري
            </button>
            <div className="relative">
              <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="admin-btn-outline inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
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
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      <OrdersHeroStats stats={stats} online={online} />
      <OrdersAnalyticsStrip orders={orders} stats={stats} />
      <OrderLifecycleHistoryPanel />
      <OrdersMainWorkspace searchInputRef={searchRef} onOpenDetail={openDetail} />

      <OrderDetailsDrawer
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setDetailId(null);
        }}
        orderId={detailId}
        canWrite={canWrite}
        canDelete={canDelete}
      />

      <OrdersCommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onFocusSearch={() => searchRef.current?.focus()}
        onRefresh={() => void loadOrders()}
        onOpenAdvanced={() => setAdvancedFiltersOpen(true)}
        onExport={() => void exportQuick()}
      />

      <OrdersToasts />
    </section>
  );
}
