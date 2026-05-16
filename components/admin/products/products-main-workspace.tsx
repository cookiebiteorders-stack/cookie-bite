"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BarChart3,
  Copy,
  Download,
  Eye,
  Filter,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
} from "lucide-react";
import { useDebounce } from "@/src/hooks/useDebounce";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import { useProductsDashboardStore } from "@/stores/products-dashboard-store";
import { cn } from "@/lib/utils";

function stockTone(stock: number, active: boolean) {
  if (!active) return { label: "غير نشط", cls: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200" };
  if (stock <= 0) return { label: "نفاد", cls: "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200" };
  if (stock <= 10) return { label: "منخفض", cls: "bg-orange-50 text-orange-900 dark:bg-orange-950/50 dark:text-orange-100" };
  return { label: "متوفر", cls: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100" };
}

function statusLabel(p: AdminProductRow) {
  if (!p.is_active) return { text: "مسودة", tone: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100" };
  if (p.stock <= 0) return { text: "نفاد مخزون", tone: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100" };
  if (p.stock <= 10) return { text: "نشط · مخزون منخفض", tone: "bg-amber-100 text-amber-950 dark:bg-amber-900/40 dark:text-amber-50" };
  return { text: "نشط", tone: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" };
}

function exportCsv(rows: AdminProductRow[]) {
  const headers = ["id", "name", "sku", "category", "price_egp", "compare_price_egp", "stock", "is_active", "updated_at"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        `"${(r.name ?? "").replace(/"/g, '""')}"`,
        r.sku ?? "",
        `"${(r.category ?? "").replace(/"/g, '""')}"`,
        r.price_egp,
        r.compare_price_egp ?? "",
        r.stock,
        r.is_active,
        r.updated_at ?? "",
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `products-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onEdit: (p: AdminProductRow) => void;
  onAdd: () => void;
};

export function ProductsMainWorkspace({ searchInputRef, onEdit, onAdd }: Props) {
  const reduceMotion = useReducedMotion();
  const products = useProductsDashboardStore((s) => s.products);
  const total = useProductsDashboardStore((s) => s.total);
  const page = useProductsDashboardStore((s) => s.page);
  const limit = useProductsDashboardStore((s) => s.limit);
  const loading = useProductsDashboardStore((s) => s.loading);
  const error = useProductsDashboardStore((s) => s.error);
  const meta = useProductsDashboardStore((s) => s.meta);
  const selectedIds = useProductsDashboardStore((s) => s.selectedIds);
  const search = useProductsDashboardStore((s) => s.search);
  const setSearch = useProductsDashboardStore((s) => s.setSearch);
  const loadProducts = useProductsDashboardStore((s) => s.loadProducts);
  const setPage = useProductsDashboardStore((s) => s.setPage);
  const toggleSelect = useProductsDashboardStore((s) => s.toggleSelect);
  const selectAllOnPage = useProductsDashboardStore((s) => s.selectAllOnPage);
  const clearSelection = useProductsDashboardStore((s) => s.clearSelection);
  const bulkPatch = useProductsDashboardStore((s) => s.bulkPatch);
  const bulkDelete = useProductsDashboardStore((s) => s.bulkDelete);
  const duplicateProduct = useProductsDashboardStore((s) => s.duplicateProduct);
  const pushToast = useProductsDashboardStore((s) => s.pushToast);
  const setLowStockOnly = useProductsDashboardStore((s) => s.setLowStockOnly);
  const lowStockOnly = useProductsDashboardStore((s) => s.lowStockOnly);
  const activeOnly = useProductsDashboardStore((s) => s.activeOnly);
  const setActiveOnly = useProductsDashboardStore((s) => s.setActiveOnly);
  const category = useProductsDashboardStore((s) => s.category);
  const setCategory = useProductsDashboardStore((s) => s.setCategory);
  const priceMin = useProductsDashboardStore((s) => s.priceMin);
  const setPriceMin = useProductsDashboardStore((s) => s.setPriceMin);
  const priceMax = useProductsDashboardStore((s) => s.priceMax);
  const setPriceMax = useProductsDashboardStore((s) => s.setPriceMax);
  const stockState = useProductsDashboardStore((s) => s.stockState);
  const setStockState = useProductsDashboardStore((s) => s.setStockState);
  const discountedOnly = useProductsDashboardStore((s) => s.discountedOnly);
  const setDiscountedOnly = useProductsDashboardStore((s) => s.setDiscountedOnly);
  const featuredOnly = useProductsDashboardStore((s) => s.featuredOnly);
  const setFeaturedOnly = useProductsDashboardStore((s) => s.setFeaturedOnly);
  const resetFilters = useProductsDashboardStore((s) => s.resetFilters);

  const canWrite = Boolean(meta?.can_write);
  const canDelete = Boolean(meta?.can_delete);

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 320);
  const advancedOpen = useProductsDashboardStore((s) => s.advancedFiltersOpen);
  const setAdvancedOpen = useProductsDashboardStore((s) => s.setAdvancedFiltersOpen);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const root = document.getElementById(`product-actions-root-${openMenuId}`);
      if (root && !root.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [openMenuId]);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const columns = useMemo<ColumnDef<AdminProductRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cb-border"
            aria-label="تحديد الكل في الصفحة"
            checked={products.length > 0 && products.every((p) => selectedIds.has(p.id))}
            onChange={() => {
              if (products.every((p) => selectedIds.has(p.id))) clearSelection();
              else selectAllOnPage();
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cb-border"
            aria-label={`تحديد ${row.original.title_en ?? row.original.name}`}
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelect(row.original.id)}
          />
        ),
        size: 36,
      },
      {
        accessorKey: "image_url",
        header: "",
        cell: ({ row }) => {
          const src = row.original.image_url;
          const label = row.original.title_en ?? row.original.name;
          return (
            <div className="h-11 w-11 overflow-hidden rounded-xl border border-cb-border bg-cb-surface-2">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={label}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-cb-text-muted">
                  <Package className="h-5 w-5" aria-hidden />
                </div>
              )}
            </div>
          );
        },
        size: 52,
      },
      {
        accessorKey: "name",
        header: "المنتج",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-stone-900 dark:text-stone-50">
              {row.original.title_en ?? row.original.name}
            </p>
            <p className="truncate text-xs text-cb-text-muted">{row.original.slug ?? row.original.name}</p>
          </div>
        ),
      },
      { accessorKey: "sku", header: "SKU", cell: (c) => c.getValue() ?? "—" },
      { accessorKey: "category", header: "التصنيف", cell: (c) => c.getValue() ?? "—" },
      {
        id: "brand",
        header: "العلامة",
        cell: () => <span className="text-cb-text-muted">Cookie Bite</span>,
      },
      {
        id: "variants",
        header: "متغيرات",
        cell: () => <span className="text-cb-text-muted">—</span>,
      },
      {
        accessorKey: "stock",
        header: "المخزون",
        cell: ({ row }) => {
          const t = stockTone(row.original.stock, row.original.is_active);
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-sm font-bold">{row.original.stock}</span>
              <span className={cn("w-fit rounded-full px-2 py-0.5 text-[10px] font-bold", t.cls)}>{t.label}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "price_egp",
        header: "السعر",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.price_egp.toLocaleString("ar-EG")}</span>,
      },
      {
        id: "discount",
        header: "خصم",
        cell: ({ row }) =>
          row.original.compare_price_egp ? (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-900 dark:bg-orange-950/50 dark:text-orange-100">
              مقارنة {Number(row.original.compare_price_egp).toLocaleString("ar-EG")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "revenue",
        header: "قيمة مخزون",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-cb-text-muted">
            {(row.original.price_egp * row.original.stock).toLocaleString("ar-EG")}
          </span>
        ),
      },
      {
        id: "status",
        header: "الحالة",
        cell: ({ row }) => {
          const s = statusLabel(row.original);
          return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.tone)}>{s.text}</span>;
        },
      },
      {
        id: "visibility",
        header: "الظهور",
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-cb-text-muted">
            {row.original.is_active ? "منشور" : "مخفي"}
          </span>
        ),
      },
      {
        id: "updated",
        header: "آخر تحديث",
        cell: ({ row }) =>
          row.original.updated_at ? (
            <span className="text-xs text-cb-text-muted">
              {format(new Date(row.original.updated_at), "d MMM yyyy")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const p = row.original;
          const open = openMenuId === p.id;
          const label = p.title_en ?? p.name;
          return (
            <div id={`product-actions-root-${p.id}`} className="relative text-end">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent hover:border-cb-border hover:bg-cb-surface-2 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-label={`إجراءات ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(open ? null : p.id);
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {open ? (
                  <motion.ul
                    onMouseDown={(e) => e.stopPropagation()}
                    initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    role="menu"
                    className="absolute end-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-xl"
                  >
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!canWrite}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setOpenMenuId(null);
                          onEdit(p);
                        }}
                      >
                        تعديل
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!canWrite}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setOpenMenuId(null);
                          void duplicateProduct(p);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> تكرار
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        disabled
                        title="معاينة المتجر للمنتج غير مفعّلة بعد"
                        aria-disabled="true"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold opacity-50 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        <Eye className="h-3.5 w-3.5" /> معاينة (غير متوفر)
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <BarChart3 className="h-3.5 w-3.5" /> تحليلات
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={!canDelete}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                        onClick={() => {
                          setOpenMenuId(null);
                          if (!canDelete) return;
                          if (!confirm(`حذف "${p.title_en ?? p.name}"؟`)) return;
                          void bulkDelete([p.id]);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> حذف
                      </button>
                    </li>
                  </motion.ul>
                ) : null}
              </AnimatePresence>
            </div>
          );
        },
      },
    ],
    [
      products,
      selectedIds,
      clearSelection,
      selectAllOnPage,
      toggleSelect,
      canWrite,
      canDelete,
      onEdit,
      duplicateProduct,
      bulkDelete,
      openMenuId,
      reduceMotion,
    ],
  );

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table يعيد دوال غير مستقرة للمُحسّن */
  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  /* eslint-enable react-hooks/incompatible-library */

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cb-border/90 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:bg-cb-surface-elevated/90">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
            <input
              ref={searchInputRef}
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="بحث: الاسم، SKU، الـ slug، التصنيف…"
              className="w-full rounded-xl border border-cb-border bg-cb-surface py-2.5 ps-10 pe-3 text-sm shadow-inner focus-visible:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
              aria-label="بحث المنتجات"
            />
            {localSearch !== debouncedSearch ? (
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-cb-text-muted" aria-hidden>
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            ) : (
              <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-cb-border bg-cb-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-cb-text-muted sm:inline">
                /
              </kbd>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              مخزون منخفض فقط
            </label>
            <select
              value={activeOnly}
              onChange={(e) => setActiveOnly(e.target.value as "" | "true" | "false")}
              aria-label="حالة النشر"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold"
            >
              <option value="">كل الحالات</option>
              <option value="true">نشط فقط</option>
              <option value="false">غير نشط</option>
            </select>
            <select
              value={stockState}
              onChange={(e) => setStockState(e.target.value as "" | "in_stock" | "low" | "out")}
              aria-label="حالة المخزون"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold"
            >
              <option value="">كل المخزون</option>
              <option value="in_stock">متوفر (&gt;10)</option>
              <option value="low">منخفض (1–10)</option>
              <option value="out">نفاد (≤0)</option>
            </select>
            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-950/60"
            >
              <SlidersHorizontal className="h-4 w-4" />
              فلاتر متقدمة
            </button>
            <button
              type="button"
              onClick={() => void loadProducts()}
              className="inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-xs font-bold hover:bg-cb-surface-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              تحديث
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCount > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-900/50 dark:bg-amber-950/30 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
              {selectedCount} منتج محدد
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
                onClick={() => void bulkPatch({ is_active: true })}
              >
                تفعيل
              </button>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
                onClick={() => void bulkPatch({ is_active: false })}
              >
                إيقاف
              </button>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
                onClick={() => {
                  const v = window.prompt("تصنيف جديد للمنتجات المحددة:");
                  if (!v?.trim()) return;
                  void bulkPatch({ category: v.trim() });
                }}
              >
                <Tag className="me-1 inline h-3.5 w-3.5" />
                تصنيف
              </button>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
                onClick={() => {
                  const v = window.prompt("كمية مخزون جديدة (رقم صحيح):");
                  if (v == null || v.trim() === "") return;
                  const n = Number(v);
                  if (!Number.isFinite(n) || n < 0) {
                    pushToast("رقم مخزون غير صالح", "error");
                    return;
                  }
                  void bulkPatch({ stock: Math.floor(n) });
                }}
              >
                تعديل مخزون
              </button>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
                onClick={() => {
                  const raw = window.prompt("وسوم (مكونات / dietary) مفصولة بفاصلة:");
                  if (raw == null) return;
                  const dietary = raw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  void bulkPatch({ dietary });
                }}
              >
                وسوم
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-stone-900"
                onClick={() => exportCsv(products.filter((p) => selectedIds.has(p.id)))}
              >
                <Download className="me-1 inline h-3.5 w-3.5" />
                تصدير المحدد
              </button>
              <button
                type="button"
                disabled={!canDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                onClick={() => {
                  if (!confirm(`حذف ${selectedCount} منتج؟`)) return;
                  void bulkDelete(Array.from(selectedIds));
                }}
              >
                حذف
              </button>
              <button type="button" className="rounded-lg px-3 py-1.5 text-xs font-bold underline" onClick={clearSelection}>
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
            onClick={() => void loadProducts()}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <div className="h-4 w-2/3 rounded bg-cb-surface-2" />
              <div className="mt-3 h-24 rounded-xl bg-cb-surface-2" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="rounded-2xl border-0 bg-[var(--brown)] p-8 text-center shadow-[0px_4px_12px_0px_rgba(0,0,0,0.15)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow dark:bg-stone-900">
              <Filter className="h-8 w-8 text-amber-600" aria-hidden />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-50">لا توجد منتجات</h3>
            <p className="mt-2 text-sm text-[var(--bg-card)]">جرّب تغيير الفلاتر أو أضف منتجاً جديداً.</p>
            <button
              type="button"
              disabled={!canWrite}
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              إضافة منتج
            </button>
          </div>
        ) : (
          products.map((p) => (
            <motion.article
              key={p.id}
              layout={!reduceMotion}
              className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm dark:bg-cb-surface-elevated"
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  aria-label={`تحديد ${p.title_en ?? p.name}`}
                />
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-cb-border bg-cb-surface-2">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.title_en ?? p.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 dark:text-stone-50">{p.title_en ?? p.name}</p>
                  <p className="text-xs text-cb-text-muted">SKU {p.sku ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusLabel(p).tone)}>
                      {statusLabel(p).text}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", stockTone(p.stock, p.is_active).cls)}>
                      {stockTone(p.stock, p.is_active).label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canWrite}
                      className="rounded-lg border border-cb-border px-3 py-1 text-xs font-bold disabled:opacity-50"
                      onClick={() => onEdit(p)}
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      disabled={!canWrite}
                      className="rounded-lg border border-cb-border px-3 py-1 text-xs font-bold disabled:opacity-50"
                      onClick={() => void duplicateProduct(p)}
                    >
                      تكرار
                    </button>
                  </div>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-cb-border/90 bg-white/95 shadow-sm dark:bg-cb-surface-elevated/95 md:block">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <caption className="sr-only">جدول المنتجات — التصفية والترقيم والإجراءات</caption>
          <thead className="bg-cb-surface-2/95 text-start text-xs font-bold uppercase tracking-wide text-cb-text-muted dark:bg-cb-surface-2/80">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="border-b border-cb-border px-3 py-3">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-cb-border">
                  {columns.map((c, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-4 animate-pulse rounded bg-cb-surface-2 dark:bg-cb-surface-2/70" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  layout={!reduceMotion}
                  className="group border-b border-cb-border/80 transition hover:bg-amber-50/40 dark:hover:bg-amber-950/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2.5 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && products.length === 0 ? (
          <div className="border-t border-cb-border bg-amber-50/40 p-10 text-center dark:bg-amber-950/15">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow dark:bg-stone-900">
              <Filter className="h-7 w-7 text-amber-600" aria-hidden />
            </div>
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-50">لا نتائج في الجدول</h3>
            <p className="mt-2 max-w-md mx-auto text-sm text-cb-text-muted">
              لا توجد منتجات تطابق البحث أو الفلاتر الحالية. غيّر معايير البحث أو أضف منتجاً جديداً.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="rounded-xl border border-cb-border bg-white px-4 py-2 text-xs font-bold shadow-sm hover:bg-cb-surface-2 dark:bg-stone-900"
                onClick={() => resetFilters()}
              >
                مسح الفلاتر
              </button>
              <button
                type="button"
                disabled={!canWrite}
                onClick={onAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                إضافة منتج
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-cb-text-muted">
          صفحة {page} / {totalPages} — إجمالي النتائج المصفاة: {total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(Math.max(1, page - 1))}
            className="rounded-xl border border-cb-border px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            السابق
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            className="rounded-xl border border-cb-border px-4 py-2 text-xs font-bold disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      </div>

      <AnimatePresence>
        {advancedOpen ? (
          <motion.div
            className="fixed inset-0 z-[75] flex justify-end bg-black/35 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setAdvancedOpen(false);
            }}
          >
            <motion.aside
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 30, opacity: 0 }}
              className="h-full w-full max-w-md overflow-y-auto border-s border-cb-border bg-cb-surface-elevated p-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="فلاتر متقدمة"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold">فلاتر متقدمة</h3>
                <button type="button" className="rounded-lg border border-cb-border px-2 py-1 text-xs" onClick={() => setAdvancedOpen(false)}>
                  إغلاق
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-cb-text-muted">تصنيف (يحتوي على)</span>
                  <input
                    className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-cb-text-muted">سعر من</span>
                    <input
                      className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                      inputMode="decimal"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-cb-text-muted">سعر إلى</span>
                    <input
                      className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                      inputMode="decimal"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={discountedOnly} onChange={(e) => setDiscountedOnly(e.target.checked)} />
                  يملك سعر مقارنة (خصم)
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} />
                  مميز (وسم featured في badges)
                </label>
                <button
                  type="button"
                  className="w-full rounded-xl border border-cb-border py-2 text-sm font-bold"
                  onClick={() => {
                    resetFilters();
                    setAdvancedOpen(false);
                  }}
                >
                  مسح كل الفلاتر
                </button>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
