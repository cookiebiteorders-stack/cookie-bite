"use client";

import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import { Loader2, RefreshCw, Search, SlidersHorizontal, Sparkles, Tag, UserPlus } from "lucide-react";
import { useDebounce } from "@/src/hooks/useDebounce";
import type { AdminCustomerRow } from "@/lib/admin/crm-types";
import { useCustomersCrmStore } from "@/stores/customers-crm-store";
import { cn } from "@/lib/utils";

function churnScore(c: AdminCustomerRow): number {
  if (!c.last_order_at) return c.points < 100 ? 68 : 38;
  const days = (Date.now() - new Date(c.last_order_at).getTime()) / 86400000;
  return Math.min(99, Math.round(28 + days * 0.45 - c.points * 0.008));
}

function engagementScore(c: AdminCustomerRow): number {
  return Math.min(100, Math.round(c.total_orders * 11 + c.points * 0.018 + (c.total_spent_egp > 500 ? 12 : 0)));
}

function tierStyle(tier: AdminCustomerRow["loyalty_tier"], points: number) {
  if (tier === "platinum" || points >= 2800) {
    return "bg-violet-100 text-violet-950 dark:bg-violet-950/50 dark:text-violet-50";
  }
  if (tier === "gold") return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-50";
  if (tier === "silver") return "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100";
  return "bg-orange-100 text-orange-950 dark:bg-orange-950/50 dark:text-orange-50";
}

function statusLabel(c: AdminCustomerRow): { text: string; cls: string } {
  const churn = churnScore(c);
  if (c.loyalty_tier === "platinum" || c.points >= 2800) return { text: "VIP", cls: "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100" };
  if (churn >= 70) return { text: "At Risk", cls: "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100" };
  if (c.total_orders === 0) return { text: "Inactive", cls: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100" };
  return { text: "Active", cls: "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" };
}

function exportCsv(rows: AdminCustomerRow[]) {
  const headers = ["id", "email", "full_name", "points", "tier", "orders", "spent", "last_order", "created_at"];
  const lines = [
    headers.join(","),
    ...rows.map((c) =>
      [
        c.id,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${(c.full_name ?? "").replace(/"/g, '""')}"`,
        c.points,
        c.loyalty_tier,
        c.total_orders,
        c.total_spent_egp,
        c.last_order_at ?? "",
        c.created_at,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenProfile: (id: string) => void;
};

export function CrmMainWorkspace({ searchInputRef, onOpenProfile }: Props) {
  const reduceMotion = useReducedMotion();
  const customers = useCustomersCrmStore((s) => s.customers);
  const total = useCustomersCrmStore((s) => s.total);
  const page = useCustomersCrmStore((s) => s.page);
  const limit = useCustomersCrmStore((s) => s.limit);
  const loading = useCustomersCrmStore((s) => s.loading);
  const error = useCustomersCrmStore((s) => s.error);
  const loadCustomers = useCustomersCrmStore((s) => s.loadCustomers);
  const setPage = useCustomersCrmStore((s) => s.setPage);
  const search = useCustomersCrmStore((s) => s.search);
  const setSearch = useCustomersCrmStore((s) => s.setSearch);
  const tierFilter = useCustomersCrmStore((s) => s.tierFilter);
  const setTierFilter = useCustomersCrmStore((s) => s.setTierFilter);
  const segmentFilter = useCustomersCrmStore((s) => s.segmentFilter);
  const setSegmentFilter = useCustomersCrmStore((s) => s.setSegmentFilter);
  const setAdvancedOpen = useCustomersCrmStore((s) => s.setAdvancedFiltersOpen);
  const advancedOpen = useCustomersCrmStore((s) => s.advancedFiltersOpen);
  const pointsMin = useCustomersCrmStore((s) => s.pointsMin);
  const setPointsMin = useCustomersCrmStore((s) => s.setPointsMin);
  const pointsMax = useCustomersCrmStore((s) => s.pointsMax);
  const setPointsMax = useCustomersCrmStore((s) => s.setPointsMax);
  const resetFilters = useCustomersCrmStore((s) => s.resetFilters);
  const pushToast = useCustomersCrmStore((s) => s.pushToast);

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 320);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const columns = useMemo<ColumnDef<AdminCustomerRow>[]>(
    () => [
      {
        id: "avatar",
        header: "",
        cell: ({ row }) => {
          const src = row.original.avatar_url;
          const label = (row.original.full_name ?? row.original.email).slice(0, 2).toUpperCase();
          return (
            <div className="h-10 w-10 overflow-hidden rounded-full border border-cb-border bg-amber-50 text-center text-xs font-bold leading-10 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="h-full w-full object-cover" />
              ) : (
                label
              )}
            </div>
          );
        },
        size: 44,
      },
      {
        id: "name",
        header: "الاسم",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-start font-semibold text-stone-900 hover:text-amber-700 dark:text-stone-50 dark:hover:text-amber-300"
            onClick={() => onOpenProfile(row.original.id)}
          >
            {row.original.full_name ?? "بدون اسم"}
            <span className="mt-0.5 block text-xs font-normal text-cb-text-muted">{row.original.email}</span>
          </button>
        ),
      },
      {
        id: "phone",
        header: "الهاتف",
        cell: () => <span className="text-cb-text-muted">—</span>,
      },
      {
        accessorKey: "loyalty_tier",
        header: "المستوى",
        cell: ({ row }) => {
          const t = row.original.loyalty_tier;
          const vip = row.original.points >= 2800;
          return (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tierStyle(t, row.original.points))}>
              {vip ? "VIP" : t}
            </span>
          );
        },
      },
      { accessorKey: "points", header: "نقاط", cell: (c) => <span className="font-mono text-sm">{c.getValue() as number}</span> },
      {
        accessorKey: "total_orders",
        header: "طلبات",
        cell: (c) => <span className="font-mono text-sm">{c.getValue() as number}</span>,
      },
      {
        accessorKey: "total_spent_egp",
        header: "إجمالي الإنفاق",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{Number(row.original.total_spent_egp).toLocaleString("ar-EG")}</span>
        ),
      },
      {
        id: "aov",
        header: "متوسط الطلب",
        cell: ({ row }) => {
          const v = row.original.total_orders ? row.original.total_spent_egp / row.original.total_orders : 0;
          return <span className="font-mono text-xs text-cb-text-muted">{Math.round(v).toLocaleString("ar-EG")}</span>;
        },
      },
      {
        accessorKey: "last_order_at",
        header: "آخر طلب",
        cell: ({ row }) =>
          row.original.last_order_at ? (
            <span className="text-xs text-cb-text-muted">{format(new Date(row.original.last_order_at), "d MMM yyyy")}</span>
          ) : (
            "—"
          ),
      },
      {
        id: "churn",
        header: "مخاطر",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-red-800 dark:text-red-200">{churnScore(row.original)}</span>
        ),
      },
      {
        id: "eng",
        header: "تفاعل",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-200">
            {engagementScore(row.original)}
          </span>
        ),
      },
      {
        id: "country",
        header: "الدولة",
        cell: () => <span className="text-xs text-cb-text-muted">مصر</span>,
      },
      {
        accessorKey: "created_at",
        header: "التسجيل",
        cell: ({ row }) => (
          <span className="text-xs text-cb-text-muted">{format(new Date(row.original.created_at), "d MMM yyyy")}</span>
        ),
      },
      {
        id: "status",
        header: "الحالة",
        cell: ({ row }) => {
          const s = statusLabel(row.original);
          return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.cls)}>{s.text}</span>;
        },
      },
      {
        id: "tags",
        header: "وسوم",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-[10px] text-cb-text-muted">
            <Tag className="h-3 w-3" aria-hidden />
            {row.original.loyalty_tier}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30"
            onClick={() => onOpenProfile(row.original.id)}
          >
            ملف
          </button>
        ),
      },
    ],
    [onOpenProfile],
  );

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table */
  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  /* eslint-enable react-hooks/incompatible-library */

  const segmentChips: { id: typeof segmentFilter; label: string }[] = [
    { id: "", label: "الكل" },
    { id: "vip", label: "VIP" },
    { id: "new", label: "جدد" },
    { id: "inactive", label: "خاملون" },
    { id: "frequent", label: "مكثرون" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-cb-border/80 bg-white/90 p-3 dark:bg-cb-surface-elevated/90">
        <p className="w-full text-[11px] font-bold uppercase tracking-wide text-cb-text-muted sm:w-auto sm:py-2">تجزئة سريعة</p>
        {segmentChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setSegmentFilter(chip.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              segmentFilter === chip.id || (chip.id === "" && segmentFilter === "")
                ? "border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-50"
                : "border-cb-border bg-cb-surface hover:bg-cb-surface-2",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-cb-border/90 bg-white/90 p-4 shadow-sm dark:bg-cb-surface-elevated/90">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
            <input
              ref={searchInputRef}
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="بحث: الاسم، البريد، معرف…"
              className="w-full rounded-xl border border-cb-border bg-cb-surface py-2.5 ps-10 pe-3 text-sm shadow-inner focus-visible:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
              aria-label="بحث العملاء"
            />
            {localSearch !== debouncedSearch ? (
              <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cb-text-muted" aria-hidden />
            ) : (
              <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-cb-border bg-cb-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-cb-text-muted sm:inline">
                /
              </kbd>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold"
              aria-label="مستوى الولاء"
            >
              <option value="">كل المستويات</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              متقدم
            </button>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-xs font-bold hover:bg-cb-surface-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              تحديث
            </button>
            <button
              type="button"
              onClick={() => exportCsv(customers)}
              className="inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-xs font-bold hover:bg-cb-surface-2"
            >
              تصدير CSV
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button type="button" className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white" onClick={() => void loadCustomers()}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <div className="h-4 w-1/2 rounded bg-cb-surface-2" />
              <div className="mt-3 h-16 rounded-xl bg-cb-surface-2" />
            </div>
          ))
        ) : customers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/20">
            <UserPlus className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
            <h3 className="mt-3 font-serif text-lg font-bold text-stone-900 dark:text-stone-50">لا عملاء</h3>
            <p className="mt-2 text-sm text-cb-text-muted">جرّب تعديل التجزئة أو البحث.</p>
            <button type="button" className="mt-4 rounded-xl border border-cb-border px-4 py-2 text-sm font-bold" onClick={() => resetFilters()}>
              مسح الفلاتر
            </button>
          </div>
        ) : (
          customers.map((c) => (
            <motion.article
              key={c.id}
              layout={!reduceMotion}
              className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm dark:bg-cb-surface-elevated"
            >
              <button type="button" className="text-start font-bold text-stone-900 dark:text-stone-50" onClick={() => onOpenProfile(c.id)}>
                {c.full_name ?? c.email}
              </button>
              <p className="text-xs text-cb-text-muted">{c.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tierStyle(c.loyalty_tier, c.points))}>
                  {c.points >= 2800 ? "VIP" : c.loyalty_tier}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusLabel(c).cls)}>{statusLabel(c).text}</span>
              </div>
              <p className="mt-2 font-mono text-sm">إنفاق {c.total_spent_egp.toLocaleString("ar-EG")} ج.م</p>
            </motion.article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-cb-border/90 bg-white/95 shadow-sm dark:bg-cb-surface-elevated/95 md:block">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead className="bg-gradient-to-b from-cb-surface-2/80 to-transparent text-start text-xs font-bold uppercase tracking-wide text-cb-text-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="border-b border-cb-border px-2 py-3">
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
                  {columns.map((_, j) => (
                    <td key={j} className="px-2 py-3">
                      <div className="h-4 animate-pulse rounded bg-cb-surface-2" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  layout={!reduceMotion}
                  className="border-b border-cb-border/80 transition hover:bg-amber-50/25 dark:hover:bg-amber-950/10"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && customers.length === 0 ? <div className="p-8 text-center text-cb-text-muted">لا نتائج.</div> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-cb-text-muted">
          صفحة {page} / {totalPages} — إجمالي: {total}
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

      {advancedOpen ? (
        <div
          className="fixed inset-0 z-[75] flex justify-end bg-black/35 backdrop-blur-[1px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setAdvancedOpen(false);
          }}
        >
          <aside
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
                <span className="text-xs font-bold text-cb-text-muted">النقاط من</span>
                <input
                  className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={pointsMin}
                  onChange={(e) => setPointsMin(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-cb-text-muted">النقاط إلى</span>
                <input
                  className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                  inputMode="numeric"
                  value={pointsMax}
                  onChange={(e) => setPointsMax(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="w-full rounded-xl border border-cb-border py-2 text-sm font-bold"
                onClick={() => {
                  resetFilters();
                  setAdvancedOpen(false);
                }}
              >
                مسح الكل
              </button>
              <p className="text-[11px] text-cb-text-muted">
                فلاتر سلوكية متقدمة (موافقة تسويق، تذاكر دعم) تتطلب أعمدة إضافية في قاعدة البيانات.
              </p>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                onClick={() => {
                  pushToast("اقتراح AI: راسل العملاء ذوي نقاط 600–1499 بعرض ترقية ذهبية.", "info");
                }}
              >
                <Sparkles className="h-4 w-4" />
                توليد اقتراح AI
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
