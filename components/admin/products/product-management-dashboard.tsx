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
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";
import { parseCsv } from "@/lib/csv/parse-csv";
import { COPILOT_REFRESH_EVENT } from "@/lib/admin/copilot/copilot-events";

export function ProductManagementDashboard() {
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const mod = (e as CustomEvent<{ module?: string }>).detail?.module;
      if (mod === "products") void loadProducts();
    };
    window.addEventListener(COPILOT_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(COPILOT_REFRESH_EVENT, onRefresh);
  }, [loadProducts]);

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

  const applyProductCsv = useCallback(
    async (file: File) => {
      const text = await file.text();
      const grid = parseCsv(text);
      if (grid.length < 2) {
        pushToast("ملف CSV فارغ أو غير صالح.", "error");
        return;
      }
      const header = grid[0]!.map((h) => h.trim().toLowerCase());
      const ix = (name: string) => header.indexOf(name);
      const idCol = ix("id");
      if (idCol < 0) {
        pushToast("CSV يجب أن يتضمن عمود id", "error");
        return;
      }
      const rows: Array<Record<string, unknown>> = [];
      for (let r = 1; r < grid.length; r++) {
        const row = grid[r]!;
        const id = row[idCol]?.trim();
        if (!id) continue;
        const rec: Record<string, unknown> = { id };
        const nameI = ix("name");
        const skuI = ix("sku");
        const catI = ix("category");
        const priceI = ix("price_egp");
        const stockI = ix("stock");
        const activeI = ix("is_active");
        if (nameI >= 0 && row[nameI]?.trim()) rec.name = row[nameI]!.trim();
        if (skuI >= 0) rec.sku = row[skuI]?.trim() || null;
        if (catI >= 0) rec.category = row[catI]?.trim() || null;
        if (priceI >= 0 && row[priceI]?.trim()) {
          const p = Number(row[priceI]);
          if (Number.isFinite(p)) rec.price_egp = p;
        }
        if (stockI >= 0 && row[stockI]?.trim()) {
          const s = Number(row[stockI]);
          if (Number.isFinite(s)) rec.stock = Math.floor(s);
        }
        if (activeI >= 0 && row[activeI]?.trim() !== "") {
          const v = row[activeI]!.trim().toLowerCase();
          rec.is_active = v === "true" || v === "1" || v === "yes";
        }
        const keys = Object.keys(rec).filter((k) => k !== "id");
        if (keys.length === 0) continue;
        rows.push(rec);
      }
      if (!rows.length) {
        pushToast("لا توجد صفوف صالحة للتحديث.", "error");
        return;
      }
      try {
        const res = await fetchJson<{ updated: number; failures: string[] }>("/api/admin/products/import-rows", {
          method: "POST",
          jsonBody: { rows },
        });
        if (res.failures?.length) {
          pushToast(`تم تحديث ${res.updated} مع ${res.failures.length} أخطاء`, "info");
        } else {
          pushToast(`تم تحديث ${res.updated} منتجاً.`, "success");
        }
        void loadProducts();
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "فشل الاستيراد", "error");
      }
    },
    [loadProducts, pushToast],
  );

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
            disabled={!canWrite}
            title={canWrite ? "استيراد CSV لتحديث المنتجات الموجودة (عمود id إلزامي)" : "صلاحية الكتابة مطلوبة"}
            onClick={() => importRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
          >
            <Upload className="h-4 w-4" aria-hidden />
            استيراد
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void applyProductCsv(f);
            }}
          />
          <button
            type="button"
            onClick={exportAllPage}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-cb-text-strong shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900 dark:text-stone-100"
          >
            <Download className="h-4 w-4" aria-hidden />
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={() => void onSync()}
            className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-cb-text-strong shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900 dark:text-stone-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            مزامنة
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-cb-text-strong shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900 dark:text-stone-100"
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
                      pushToast("سجلات التدقيق متاحة من وحدة الإدارة الأمنية عند تفعيلها.", "info");
                    }}
                  >
                    تدقيق وصلاحيات
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      </motion.div>

      <ProductsHeroAndStats stats={stats} online={online} />
      <ProductAssistantPanel canWrite={canWrite} />
      <ProductsAnalyticsStrip products={products} />
      <ProductsMainWorkspace searchInputRef={searchRef} onEdit={openEdit} onAdd={openCreate} />

      <ProductFormDrawer
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        canWrite={canWrite}
      />

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
          "fixed bottom-[5.75rem] end-5 z-[44] flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/80 sm:bottom-24 sm:end-6 sm:h-14 sm:w-14",
          "bg-amber-600 text-white shadow-xl hover:bg-amber-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-40",
        )}
        aria-label="إضافة منتج سريعة"
      >
        <Sparkles className="h-6 w-6" aria-hidden />
      </motion.button>
    </section>
  );
}
