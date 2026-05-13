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
  Download,
  Loader2,
  Mail,
  MoreHorizontal,
  Package,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/src/hooks/useDebounce";
import type { AdminOrderRow } from "@/lib/admin/orders-operations-types";
import { useOrdersOperationsStore } from "@/stores/orders-operations-store";
import { cn } from "@/lib/utils";

function initialsFromEmail(email: string | null) {
  if (!email) return "?";
  const p = email.split("@")[0] ?? "?";
  return p.slice(0, 2).toUpperCase();
}

function statusBadge(status: AdminOrderRow["status"]) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-50 dark:ring-amber-800",
    processing: "bg-sky-100 text-sky-950 ring-1 ring-sky-300 dark:bg-sky-950/50 dark:text-sky-50 dark:ring-sky-800",
    shipped: "bg-cyan-100 text-cyan-950 ring-1 ring-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-50 dark:ring-cyan-800",
    delivered: "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-50 dark:ring-emerald-800",
    cancelled: "bg-red-100 text-red-900 ring-1 ring-red-300 dark:bg-red-950/50 dark:text-red-50 dark:ring-red-800",
    refunded: "bg-orange-100 text-orange-950 ring-1 ring-orange-300 dark:bg-orange-950/50 dark:text-orange-50 dark:ring-orange-800",
  };
  return map[status] ?? "bg-stone-100 text-stone-900 ring-1 ring-stone-300 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700";
}

function payBadge(p: AdminOrderRow["payment_status"]) {
  const map: Record<string, string> = {
    unpaid: "bg-amber-50 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800",
    paid: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-800",
    failed: "bg-red-50 text-red-900 ring-1 ring-red-300 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-800",
    refunded: "bg-violet-50 text-violet-900 ring-1 ring-violet-300 dark:bg-violet-950/40 dark:text-violet-100 dark:ring-violet-800",
  };
  return map[p] ?? "bg-stone-100 text-stone-900 ring-1 ring-stone-300 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700";
}

function deliveryLabel(status: AdminOrderRow["status"]) {
  if (status === "delivered") return "تم التسليم";
  if (status === "shipped") return "قيد النقل";
  if (status === "processing") return "قيد التجهيز";
  if (status === "cancelled") return "ملغى";
  if (status === "refunded") return "مسترد";
  return "قيد الانتظار";
}

function exportCsv(rows: AdminOrderRow[]) {
  const headers = [
    "id",
    "order_code",
    "guest_email",
    "total_egp",
    "delivery_fee_egp",
    "discount_amount_egp",
    "status",
    "payment_status",
    "created_at",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.order_code ?? "",
        `"${(r.guest_email ?? "").replace(/"/g, '""')}"`,
        r.total_egp,
        r.delivery_fee_egp ?? 0,
        r.discount_amount_egp ?? 0,
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
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenDetail: (id: string) => void;
};

export function OrdersMainWorkspace({ searchInputRef, onOpenDetail }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const orders = useOrdersOperationsStore((s) => s.orders);
  const total = useOrdersOperationsStore((s) => s.total);
  const page = useOrdersOperationsStore((s) => s.page);
  const limit = useOrdersOperationsStore((s) => s.limit);
  const loading = useOrdersOperationsStore((s) => s.loading);
  const error = useOrdersOperationsStore((s) => s.error);
  const meta = useOrdersOperationsStore((s) => s.meta);
  const selectedIds = useOrdersOperationsStore((s) => s.selectedIds);
  const search = useOrdersOperationsStore((s) => s.search);
  const setSearch = useOrdersOperationsStore((s) => s.setSearch);
  const loadOrders = useOrdersOperationsStore((s) => s.loadOrders);
  const setPage = useOrdersOperationsStore((s) => s.setPage);
  const toggleSelect = useOrdersOperationsStore((s) => s.toggleSelect);
  const selectAllOnPage = useOrdersOperationsStore((s) => s.selectAllOnPage);
  const clearSelection = useOrdersOperationsStore((s) => s.clearSelection);
  const bulkPatchOrders = useOrdersOperationsStore((s) => s.bulkPatchOrders);
  const pushToast = useOrdersOperationsStore((s) => s.pushToast);
  const statusFilter = useOrdersOperationsStore((s) => s.statusFilter);
  const setStatusFilter = useOrdersOperationsStore((s) => s.setStatusFilter);
  const paymentFilter = useOrdersOperationsStore((s) => s.paymentFilter);
  const setPaymentFilter = useOrdersOperationsStore((s) => s.setPaymentFilter);
  const dateFrom = useOrdersOperationsStore((s) => s.dateFrom);
  const setDateFrom = useOrdersOperationsStore((s) => s.setDateFrom);
  const dateTo = useOrdersOperationsStore((s) => s.dateTo);
  const setDateTo = useOrdersOperationsStore((s) => s.setDateTo);
  const totalMin = useOrdersOperationsStore((s) => s.totalMin);
  const setTotalMin = useOrdersOperationsStore((s) => s.setTotalMin);
  const totalMax = useOrdersOperationsStore((s) => s.totalMax);
  const setTotalMax = useOrdersOperationsStore((s) => s.setTotalMax);
  const advancedOpen = useOrdersOperationsStore((s) => s.advancedFiltersOpen);
  const setAdvancedOpen = useOrdersOperationsStore((s) => s.setAdvancedFiltersOpen);
  const resetFilters = useOrdersOperationsStore((s) => s.resetFilters);

  const canWrite = Boolean(meta?.can_write);

  const [localSearch, setLocalSearch] = useState(search);
  const debouncedSearch = useDebounce(localSearch, 320);
  const [menuId, setMenuId] = useState<string | null>(null);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const columns = useMemo<ColumnDef<AdminOrderRow>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cb-border"
            aria-label="تحديد الكل"
            checked={orders.length > 0 && orders.every((o) => selectedIds.has(o.id))}
            onChange={() => {
              if (orders.every((o) => selectedIds.has(o.id))) clearSelection();
              else selectAllOnPage();
            }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cb-border"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelect(row.original.id)}
            aria-label={`تحديد ${row.original.order_code ?? row.original.id}`}
          />
        ),
        size: 36,
      },
      {
        accessorKey: "order_code",
        header: "رقم الطلب",
        cell: ({ row }) => (
          <button
            type="button"
            className="text-start font-mono text-sm font-bold text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
            onClick={() => onOpenDetail(row.original.id)}
          >
            {row.original.order_code ?? row.original.id.slice(0, 8)}
          </button>
        ),
      },
      {
        id: "customer",
        header: "العميل",
        cell: ({ row }) => {
          const em = row.original.guest_email;
          return (
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-100">
                {initialsFromEmail(em ?? null)}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-cb-text-muted" aria-hidden />
                  <span className="truncate">{em ?? "—"}</span>
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "items",
        header: "بنود",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.items_count ?? "—"}</span>,
      },
      {
        accessorKey: "total_egp",
        header: "الإجمالي",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold">{Number(row.original.total_egp).toLocaleString("ar-EG")}</span>
        ),
      },
      {
        id: "ship_fee",
        header: "شحن",
        cell: ({ row }) => (
          <span className="text-xs text-cb-text-muted">
            {Number(row.original.delivery_fee_egp ?? 0).toLocaleString("ar-EG")}
          </span>
        ),
      },
      {
        id: "disc",
        header: "خصم",
        cell: ({ row }) => (
          <span className="text-xs text-cb-text-muted">
            {Number(row.original.discount_amount_egp ?? 0).toLocaleString("ar-EG")}
          </span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "الدفع",
        cell: ({ row }) => <span className="text-xs">{row.original.payment_method ?? "—"}</span>,
      },
      {
        accessorKey: "payment_status",
        header: "حالة الدفع",
        cell: ({ row }) => (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", payBadge(row.original.payment_status))}>
            {row.original.payment_status}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "التنفيذ",
        cell: ({ row }) => (
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusBadge(row.original.status))}>
            {row.original.status}
          </span>
        ),
      },
      {
        id: "delivery",
        header: "التسليم",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-xs text-cb-text-muted">
            <Truck className="h-3.5 w-3.5" aria-hidden />
            {deliveryLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: "track",
        header: "تتبع",
        cell: ({ row }) => {
          const ship = (row.original.shipping_address ?? {}) as Record<string, unknown>;
          const t = typeof ship.tracking_number === "string" ? ship.tracking_number : "—";
          return <span className="max-w-[100px] truncate font-mono text-[11px]">{t}</span>;
        },
      },
      {
        id: "courier",
        header: "الشحن",
        cell: ({ row }) => {
          const ship = (row.original.shipping_address ?? {}) as Record<string, unknown>;
          return <span className="text-xs">{typeof ship.courier === "string" ? ship.courier : "—"}</span>;
        },
      },
      {
        accessorKey: "created_at",
        header: "التاريخ",
        cell: ({ row }) => (
          <span className="text-xs text-cb-text-muted">{format(new Date(row.original.created_at), "d MMM HH:mm")}</span>
        ),
      },
      {
        id: "updated",
        header: "آخر تحديث",
        cell: ({ row }) =>
          row.original.updated_at ? (
            <span className="text-xs text-cb-text-muted">
              {format(new Date(row.original.updated_at), "d MMM HH:mm")}
            </span>
          ) : (
            "—"
          ),
      },
      {
        id: "priority",
        header: "أولوية",
        cell: () => <span className="text-[10px] font-bold text-cb-text-muted">عادي</span>,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const o = row.original;
          const open = menuId === o.id;
          return (
            <div className="relative text-end">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent hover:border-cb-border hover:bg-cb-surface-2"
                aria-expanded={open}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuId(open ? null : o.id);
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
                    className="absolute end-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-xl"
                    role="menu"
                  >
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setMenuId(null);
                          onOpenDetail(o.id);
                        }}
                      >
                        عرض التفاصيل
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full px-3 py-2 text-xs font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        onClick={() => {
                          setMenuId(null);
                          void navigator.clipboard?.writeText(o.id).catch(() => undefined);
                          pushToast("تم نسخ معرّف الطلب. صفحة الفواتير: أنشئ فاتورة والصق المعرّف عند الطلب.", "info");
                          router.push("/admin/invoices");
                        }}
                      >
                        <Printer className="me-1 inline h-3.5 w-3.5" />
                        طباعة
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
      orders,
      selectedIds,
      clearSelection,
      selectAllOnPage,
      toggleSelect,
      onOpenDetail,
      pushToast,
      menuId,
      reduceMotion,
      router,
    ],
  );

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table */
  const table = useReactTable({
    data: orders,
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
              placeholder="بحث: رقم الطلب، البريد…"
            className="w-full rounded-xl border border-cb-border bg-cb-surface py-2.5 ps-10 pe-3 text-sm text-cb-text-strong shadow-inner focus-visible:border-cb-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus/40"
              aria-label="بحث الطلبات"
            />
            {localSearch !== debouncedSearch ? (
              <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cb-text-muted" aria-hidden />
            ) : (
              <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-cb-border bg-cb-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-cb-text-muted sm:inline">
                /
              </kbd>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold"
              aria-label="حالة الطلب"
            >
              <option value="">كل الحالات</option>
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
              <option value="refunded">refunded</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-semibold"
              aria-label="حالة الدفع"
            >
              <option value="">كل المدفوعات</option>
              <option value="unpaid">unpaid</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
            <button
              type="button"
              onClick={() => setAdvancedOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              متقدم
            </button>
            <button
              type="button"
              onClick={() => void loadOrders()}
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
            className="flex flex-col gap-3 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 to-white p-4 dark:border-sky-900/50 dark:from-sky-950/25 dark:to-stone-900 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <p className="text-sm font-bold text-sky-950 dark:text-sky-100">{selectedCount} محدد</p>
            <div className="flex flex-wrap gap-2">
              <select
                disabled={!canWrite}
                defaultValue=""
                className="rounded-lg border border-cb-border bg-white px-2 py-1.5 text-xs font-bold dark:bg-stone-900"
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  void bulkPatchOrders(Array.from(selectedIds), { status: v });
                  e.currentTarget.value = "";
                }}
              >
                <option value="">تغيير الحالة</option>
                <option value="processing">processing</option>
                <option value="shipped">shipped</option>
                <option value="delivered">delivered</option>
                <option value="cancelled">cancelled</option>
              </select>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-stone-900"
                onClick={() => void bulkPatchOrders(Array.from(selectedIds), { payment_status: "paid" })}
              >
                تعيين مدفوع
              </button>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-stone-900"
                onClick={() => void bulkPatchOrders(Array.from(selectedIds), { status: "shipped" })}
              >
                تعيين شُحن
              </button>
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-stone-900"
                onClick={() => exportCsv(orders.filter((o) => selectedIds.has(o.id)))}
              >
                <Download className="me-1 inline h-3.5 w-3.5" />
                تصدير
              </button>
              <button
                type="button"
                disabled={!canWrite}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-stone-900"
                onClick={() => {
                  pushToast("إشعار للعميل — اربط بقناة SMS/بريد لاحقاً", "info");
                }}
              >
                إشعار
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
            className="rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white"
            onClick={() => void loadOrders()}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 md:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <div className="h-4 w-1/2 rounded bg-cb-surface-2" />
              <div className="mt-3 h-20 rounded-xl bg-cb-surface-2" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/20">
            <Package className="mx-auto h-10 w-10 text-amber-600" aria-hidden />
            <h3 className="mt-3 font-serif text-lg font-bold text-stone-900 dark:text-stone-50">لا توجد طلبات</h3>
            <p className="mt-2 text-sm text-cb-text-muted">جرّب توسيع نطاق البحث أو إزالة الفلاتر.</p>
            <button
              type="button"
              className="mt-4 rounded-xl border border-cb-border px-4 py-2 text-sm font-bold"
              onClick={() => resetFilters()}
            >
              مسح الفلاتر
            </button>
          </div>
        ) : (
          orders.map((o) => (
            <motion.article
              key={o.id}
              layout={!reduceMotion}
              className="rounded-2xl border border-cb-border bg-white p-4 shadow-sm dark:bg-cb-surface-elevated"
            >
              <div className="flex gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selectedIds.has(o.id)}
                  onChange={() => toggleSelect(o.id)}
                />
                <div className="min-w-0 flex-1">
                  <button type="button" className="font-mono font-bold text-amber-800 dark:text-amber-200" onClick={() => onOpenDetail(o.id)}>
                    {o.order_code ?? o.id.slice(0, 8)}
                  </button>
                  <p className="truncate text-xs text-cb-text-muted">{o.guest_email ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", statusBadge(o.status))}>{o.status}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", payBadge(o.payment_status))}>
                      {o.payment_status}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-sm font-bold">{Number(o.total_egp).toLocaleString("ar-EG")} ج.م</p>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-cb-border/90 bg-cb-surface-elevated shadow-sm md:block">
        <table data-cb-zebra="true" className="w-full min-w-[1280px] border-collapse text-sm">
          <thead className="bg-gradient-to-b from-cb-surface-2/80 to-transparent text-start text-xs font-bold uppercase tracking-wide text-cb-text-strong">
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
                  className="group border-b border-cb-border/80 transition"
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
        {!loading && orders.length === 0 ? <div className="p-8 text-center text-cb-text-muted">لا نتائج.</div> : null}
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
                  <span className="text-xs font-bold text-cb-text-muted">من تاريخ</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-bold text-cb-text-muted">إلى تاريخ</span>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-cb-text-muted">إجمالي من</span>
                    <input
                      className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                      inputMode="decimal"
                      value={totalMin}
                      onChange={(e) => setTotalMin(e.target.value)}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-cb-text-muted">إجمالي إلى</span>
                    <input
                      className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
                      inputMode="decimal"
                      value={totalMax}
                      onChange={(e) => setTotalMax(e.target.value)}
                    />
                  </label>
                </div>
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
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
