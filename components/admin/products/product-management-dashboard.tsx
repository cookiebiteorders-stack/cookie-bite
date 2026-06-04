"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { motion, useReducedMotion } from "motion/react";
import {
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { ImportExportToolbar } from "@/components/admin/import-export/import-export-toolbar";
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
import { COPILOT_REFRESH_EVENT } from "@/lib/admin/copilot/copilot-events";

type ProductsSyncResponse = {
  ok: boolean;
  revalidated_product_pages?: number;
  message?: { ar?: string; en?: string };
};

function canOpenAdminModule(role: string | undefined, module: "audit" | "settings" | "cms") {
  if (!role || role === "customer") return false;
  if (role === "owner" || role === "admin") return true;
  if (module === "cms") return false;
  return false;
}

export function ProductManagementDashboard() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
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
  const [syncing, setSyncing] = useState(false);

  const canWrite = Boolean(meta?.can_write);
  const actorRole = meta?.role;

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

  useEffect(() => {
    if (!settingsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (settingsRef.current?.contains(e.target as Node)) return;
      setSettingsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [settingsOpen]);

  const onSync = useCallback(async () => {
    if (!canWrite || syncing) return;
    setSyncing(true);
    try {
      const res = await fetchJson<ProductsSyncResponse>("/api/admin/products/sync", {
        method: "POST",
        jsonBody: {},
      });
      await loadProducts();
      const base =
        res.message?.ar?.trim() ||
        res.message?.en?.trim() ||
        "تم تحديث كاش المتجر وإعادة تحميل القائمة.";
      const pages = res.revalidated_product_pages;
      const detail =
        typeof pages === "number" && pages > 0 ? ` (${pages} صفحة منتج في المتجر)` : "";
      pushToast(`${base}${detail}`, "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "فشل المزامنة", "error");
    } finally {
      setSyncing(false);
    }
  }, [canWrite, syncing, loadProducts, pushToast]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const settingsMenuItems = useMemo(
    () =>
      [
        {
          id: "advanced-filters",
          label: "فلاتر متقدمة",
          icon: SlidersHorizontal,
          onClick: () => {
            closeSettings();
            setAdvancedFiltersOpen(true);
          },
        },
        {
          id: "audit",
          label: "سجلات تدقيق المنتجات",
          icon: Shield,
          hidden: !canOpenAdminModule(actorRole, "audit"),
          onClick: () => {
            closeSettings();
            router.push("/admin/audit-logs?module=products");
          },
        },
        {
          id: "shop-preview",
          label: "معاينة المتجر",
          icon: ExternalLink,
          onClick: () => {
            closeSettings();
            window.open("/shop", "_blank", "noopener,noreferrer");
          },
        },
        {
          id: "cms",
          label: "إدارة المحتوى (CMS)",
          icon: FileText,
          hidden: !canOpenAdminModule(actorRole, "cms"),
          onClick: () => {
            closeSettings();
            router.push("/admin/cms");
          },
        },
        {
          id: "system-settings",
          label: "إعدادات النظام",
          icon: Settings,
          hidden: !canOpenAdminModule(actorRole, "settings"),
          onClick: () => {
            closeSettings();
            router.push("/admin/settings");
          },
        },
      ].filter((item) => !item.hidden),
    [actorRole, closeSettings, router, setAdvancedFiltersOpen],
  );

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
            operations — اختصارات:             <kbd className="rounded border border-cb-brand-200 bg-cb-brand-50 px-1 font-mono text-[10px] text-cb-brand-800">⌘K</kbd> أو{" "}
            <kbd className="rounded border border-cb-brand-200 bg-cb-brand-50 px-1 font-mono text-[10px] text-cb-brand-800">Ctrl+K</kbd> للأوامر،{" "}
            <kbd className="rounded border border-cb-brand-200 bg-cb-brand-50 px-1 font-mono text-[10px] text-cb-brand-800">/</kbd> للبحث،{" "}
            <kbd className="rounded border border-cb-brand-200 bg-cb-brand-50 px-1 font-mono text-[10px] text-cb-brand-800">N</kbd> لإضافة منتج.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canWrite}
            onClick={openCreate}
            className="admin-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold focus-visible:outline focus-visible:ring-2 focus-visible:ring-cb-brand-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden />
            إضافة منتج
          </button>
          <ImportExportToolbar
            module="products"
            canWrite={canWrite}
            onImportSuccess={() => {
              pushToast("تم الاستيراد بنجاح.", "success");
              void loadProducts();
            }}
          />
          <button
            type="button"
            disabled={!canWrite || syncing}
            title={
              canWrite
                ? "تحديث كاش المتجر وإعادة تحميل القائمة"
                : "صلاحية القراءة فقط — لا يمكن المزامنة"
            }
            onClick={() => void onSync()}
            className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} aria-hidden />
            {syncing ? "جاري المزامنة…" : "مزامنة"}
          </button>
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
            >
              <Settings className="h-4 w-4" aria-hidden />
              إعدادات
            </button>
            {settingsOpen ? (
              <ul
                role="menu"
                className="absolute end-0 z-30 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-xl"
              >
                {settingsMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={item.onClick}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
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
        onSync={() => void onSync()}
        onOpenAdvanced={() => setAdvancedFiltersOpen(true)}
        onExport={() => pushToast("استخدم زر التصدير في شريط الأدوات.", "info")}
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
          "admin-btn-primary shadow-xl focus-visible:outline focus-visible:ring-2 focus-visible:ring-cb-brand-300 disabled:opacity-40",
        )}
        aria-label="إضافة منتج سريعة"
      >
        <Sparkles className="h-6 w-6" aria-hidden />
      </motion.button>
    </section>
  );
}
