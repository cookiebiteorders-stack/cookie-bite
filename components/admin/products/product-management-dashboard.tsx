"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { motion, useReducedMotion } from "motion/react";
import { Download, Plus, RefreshCw, Settings, Sparkles, Upload } from "lucide-react";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { ProductsHeroAndStats } from "@/components/admin/products/products-hero-and-stats";
import { ProductsAnalyticsStrip } from "@/components/admin/products/products-analytics-strip";
import { ProductsMainWorkspace } from "@/components/admin/products/products-main-workspace";
import { ProductFormDrawer } from "@/components/admin/products/product-form-drawer";
import { ProductAssistantPanel } from "@/components/admin/products/product-assistant-panel";
import { ProductsToasts } from "@/components/admin/products/products-toasts";
import { ProductsCommandPalette } from "@/components/admin/products/products-command-palette";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useTheme } from "@/components/providers/theme-provider";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

export function ProductManagementDashboard() {
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

  const stats = useProductsDashboardStore((s) => s.stats);
  const online = useProductsDashboardStore((s) => s.online);
  const loadProducts = useProductsDashboardStore((s) => s.loadProducts);
  const products = useProductsDashboardStore((s) => s.products);
  const meta = useProductsDashboardStore((s) => s.meta);
  const pushToast = useProductsDashboardStore((s) => s.pushToast);
  const setAdvancedFiltersOpen = useProductsDashboardStore((s) => s.setAdvancedFiltersOpen);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProductRow | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const canWrite = Boolean(meta?.can_write);

  const page = useProductsDashboardStore((s) => s.page);
  const search = useProductsDashboardStore((s) => s.search);
  const lowStockOnly = useProductsDashboardStore((s) => s.lowStockOnly);
  const activeOnly = useProductsDashboardStore((s) => s.activeOnly);
  const category = useProductsDashboardStore((s) => s.category);
  const priceMin = useProductsDashboardStore((s) => s.priceMin);
  const priceMax = useProductsDashboardStore((s) => s.priceMax);
  const stockState = useProductsDashboardStore((s) => s.stockState);
  const discountedOnly = useProductsDashboardStore((s) => s.discountedOnly);
  const featuredOnly = useProductsDashboardStore((s) => s.featuredOnly);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadProducts();
    });
    return cancel;
  }, [
    loadProducts,
    page,
    search,
    lowStockOnly,
    activeOnly,
    category,
    priceMin,
    priceMax,
    stockState,
    discountedOnly,
    featuredOnly,
  ]);

  const openCreate = useCallback(() => {
    if (!canWrite) return;
    setEditing(null);
    setFormOpen(true);
  }, [canWrite]);

  const openEdit = useCallback((p: AdminProductRow) => {
    setEditing(p);
    setFormOpen(true);
  }, []);

  const exportAllPage = useCallback(() => {
    const headers = ["id", "name", "sku", "category", "price_egp", "stock", "is_active"];
    const lines = [
      headers.join(","),
      ...products.map((r) =>
        [
          r.id,
          `"${(r.name ?? "").replace(/"/g, '""')}"`,
          r.sku ?? "",
          `"${(r.category ?? "").replace(/"/g, '""')}"`,
          r.price_egp,
          r.stock,
          r.is_active,
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-page-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("تم تصدير الصفحة الحالية.", "success");
  }, [products, pushToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "/" && !typing && !formOpen && !cmdkOpen) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.key === "n" || e.key === "N") && !typing && !formOpen && !cmdkOpen && canWrite) {
        e.preventDefault();
        openCreate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen, cmdkOpen, canWrite, openCreate]);

  const onSync = useCallback(async () => {
    try {
      await fetchJson("/api/admin/products/sync", { method: "POST", jsonBody: {} });
      pushToast("تم قبول طلب المزامنة اليدوية.", "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "فشل المزامنة", "error");
    }
  }, [pushToast]);

  const cycleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return (
    <section className="relative space-y-6 pb-24">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "admin-panel-surface flex flex-col gap-4 rounded-2xl p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className="admin-panel-scrim" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-900 dark:text-amber-200/95">
            Catalog
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-cb-text-strong sm:text-2xl">
            إدارة المنتجات
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-cb-text-muted">
            Manage catalog, variants, pricing, stock thresholds, publishing state, SEO, analytics, and inventory
            operations — اختصارات: <kbd className="rounded border px-1 font-mono text-[10px] text-white">⌘K</kbd> أو{" "}
            <kbd className="rounded border px-1 font-mono text-[10px] text-white">Ctrl+K</kbd> للأوامر،{" "}
            <kbd className="rounded border px-1 font-mono text-[10px] text-white">/</kbd> للبحث،{" "}
            <kbd className="rounded border px-1 font-mono text-[10px] text-white">N</kbd> لإضافة منتج.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canWrite}
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            إضافة منتج
          </button>
          <button
            type="button"
            disabled
            title="استيراد CSV غير مفعّل — استخدم تصدير CSV كنموذج للأعمدة"
            aria-disabled="true"
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm opacity-50 dark:bg-stone-900"
          >
            <Upload className="h-4 w-4" aria-hidden />
            استيراد
          </button>
          <button
            type="button"
            onClick={exportAllPage}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-[var(--bg-main)] shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900"
          >
            <Download className="h-4 w-4" aria-hidden />
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={() => void onSync()}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-[var(--bg-main)] shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            مزامنة
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-[var(--bg-main)] shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900"
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
            >
              <Settings className="h-4 w-4" aria-hidden />
              إعدادات
            </button>
            {settingsOpen ? (
              <ul
                role="menu"
                className="absolute end-0 z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-xl"
                onMouseLeave={() => setSettingsOpen(false)}
              >
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    onClick={() => {
                      setSettingsOpen(false);
                      cycleTheme();
                    }}
                  >
                    تبديل المظهر (فاتح / داكن)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    onClick={() => {
                      setSettingsOpen(false);
                      pushToast("سجلات التدقيق متاحة من وحدة الإدارة الأمنية عند تفعيلها.", "info");
                    }}
                  >
                    تدقيق وصلاحيات
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
          <ThemeToggle className="shrink-0" />
        </div>
      </motion.div>

      <ProductsHeroAndStats stats={stats} online={online} />
      <ProductAssistantPanel canWrite={canWrite} />
      <ProductsAnalyticsStrip products={products} />
      <ProductsMainWorkspace searchInputRef={searchRef} onEdit={openEdit} onAdd={openCreate} />

      {formOpen ? (
        <ProductFormDrawer
          key={editing?.id ?? "new-product"}
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          canWrite={canWrite}
        />
      ) : null}

      <ProductsCommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onAddProduct={openCreate}
        onFocusSearch={() => searchRef.current?.focus()}
        onRefresh={() => void loadProducts()}
        onOpenAdvanced={() => setAdvancedFiltersOpen(true)}
        onExport={exportAllPage}
      />

      <ProductsToasts />

      <motion.button
        type="button"
        initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={reduceMotion ? undefined : { scale: 1.04 }}
        whileTap={reduceMotion ? undefined : { scale: 0.97 }}
        disabled={!canWrite}
        onClick={openCreate}
        className={cn(
          "fixed bottom-6 end-6 z-[60] flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/80",
          "bg-amber-600 text-white shadow-xl hover:bg-amber-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-40",
        )}
        aria-label="إضافة منتج سريعة"
      >
        <Sparkles className="h-6 w-6" aria-hidden />
      </motion.button>
    </section>
  );
}
