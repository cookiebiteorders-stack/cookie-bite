"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FilePlus2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { buttonClassName } from "@/components/ui/button";
import { InvoiceView } from "@/components/invoices/invoice-view";
import { PrintActions } from "@/components/print/print-actions";
import { toInvoiceViewModel } from "@/lib/invoices/to-invoice-view-model";
import { cn } from "@/lib/utils";

type InvoiceStatus = "paid" | "pending" | "failed" | "refunded";

type Invoice = {
  id: string;
  invoice_number: string;
  amount_egp: number;
  status: InvoiceStatus;
  issued_at: string;
  customer_name: string | null;
  customer_email: string | null;
  order: {
    id: string | null;
    order_code: string | null;
    status: string | null;
    items: Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price_egp: number;
    }>;
  };
  payment: {
    id: string | null;
    method: string | null;
    transaction_id: string | null;
    status: string | null;
    paid_at: string | null;
  };
};

type ApiPayload = {
  invoices: Invoice[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  meta?: { source?: string };
  debug?: Record<string, unknown>;
  actor?: { role?: string; permission?: string };
};

type FilterState = {
  status: "all" | InvoiceStatus;
  customer: string;
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
};

const STATUS_META: Record<
  InvoiceStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-800",
  },
  pending: {
    label: "Pending",
    className:
      "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-800",
  },
  failed: {
    label: "Failed",
    className:
      "bg-red-100 text-red-900 ring-red-300 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-800",
  },
  refunded: {
    label: "Refunded",
    className:
      "bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-950/60 dark:text-sky-100 dark:ring-sky-800",
  },
};

function money(value: number): string {
  return `EGP ${Number(value || 0).toLocaleString("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toCsv(rows: Invoice[]): string {
  const header = ["Invoice ID", "Customer", "Email", "Order", "Amount", "Status", "Payment", "Issued"];
  const body = rows.map((row) => [
    row.invoice_number,
    row.customer_name ?? "",
    row.customer_email ?? "",
    row.order.order_code ?? row.order.id ?? "",
    String(row.amount_egp ?? 0),
    row.status,
    row.payment.status ?? "",
    row.issued_at,
  ]);
  const csvLine = (cells: string[]) =>
    cells.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",");
  return [csvLine(header), ...body.map(csvLine)].join("\n");
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

function InvoiceDrawer({
  invoice,
  open,
  onClose,
}: {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  const viewModel = useMemo(
    () => (invoice ? toInvoiceViewModel(invoice) : null),
    [invoice],
  );

  return (
    <AnimatePresence>
      {open && invoice && viewModel ? (
        <motion.div
          className="fixed inset-0 z-[85] flex justify-end bg-black/45 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-drawer-title"
            className="flex h-full w-full max-w-3xl flex-col border-s border-cb-border bg-[#f0ede6] shadow-2xl dark:bg-stone-950"
            initial={reduceMotion ? false : { x: 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 26, opacity: 0 }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-cb-border bg-cb-surface-elevated px-5 py-4">
              <div>
                <h2
                  id="invoice-drawer-title"
                  className="font-serif text-xl font-bold text-cb-text-strong"
                >
                  Invoice Details
                </h2>
                <p className="mt-1 font-mono text-sm text-cb-text-muted">
                  {invoice.invoice_number}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <PrintActions
                  printRootSelector=".inv-root"
                  pdfHref={`/api/invoices/${encodeURIComponent(invoice.invoice_number)}/pdf`}
                  size="sm"
                />
                <a
                  href={`/invoices/${invoice.invoice_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClassName(
                    "outline",
                    "min-h-0 px-3 py-1.5 text-xs",
                  )}
                  title="Open full invoice in a new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open full
                </a>
                <button
                  type="button"
                  className="rounded-xl border border-cb-border p-2 text-cb-text-muted hover:bg-cb-surface-2"
                  onClick={onClose}
                  aria-label="Close drawer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
              <InvoiceView invoice={viewModel} />
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<Record<string, unknown> | undefined>(undefined);
  const [isOwner, setIsOwner] = useState(false);
  const [source, setSource] = useState("orders_fallback");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    customer: "",
    minAmount: "",
    maxAmount: "",
    dateFrom: "",
    dateTo: "",
  });

  const loadInvoices = useCallback(
    async ({ reset, silent }: { reset: boolean; silent?: boolean }) => {
      const nextPage = reset ? 1 : page + 1;
      if (reset) {
        if (!silent) setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: "20",
          status: filters.status,
        });
        if (filters.customer.trim()) params.set("customer", filters.customer.trim());
        if (filters.minAmount.trim()) params.set("minAmount", filters.minAmount.trim());
        if (filters.maxAmount.trim()) params.set("maxAmount", filters.maxAmount.trim());
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);

        const res = await fetch(`/api/admin/invoices?${params.toString()}`, { cache: "no-store" });
        const payload = (await res.json()) as ApiPayload & {
          error?: { en?: string; ar?: string };
          details?: string;
          code?: string;
          migration?: string;
        };
        if (!res.ok) {
          const message =
            payload.error?.ar && document.documentElement.lang === "ar"
              ? payload.error.ar
              : (payload.error?.en ?? "Failed to load invoices");
          const hint =
            payload.code === "invoices_table_missing" && payload.migration
              ? ` · Supabase: supabase/migrations/${payload.migration}`
              : "";
          throw new Error(
            payload.details ? `${message}${hint} (${payload.details})` : `${message}${hint}`,
          );
        }

        setRows((prev) => (reset ? payload.invoices ?? [] : [...prev, ...(payload.invoices ?? [])]));
        setPage(nextPage);
        setHasMore(Boolean(payload.pagination?.hasMore));
        setTotal(Number(payload.pagination?.total ?? 0));
        setDebug(payload.debug);
        setIsOwner(payload.actor?.role === "owner");
        setSource(payload.meta?.source ?? "orders_fallback");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setNotice(`Failed to load invoices: ${message}`);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [filters, page],
  );

  useEffect(() => {
    let cancelled = false;
    const cancelSchedule = scheduleEffectTask(() => {
      if (!cancelled) void loadInvoices({ reset: true });
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [loadInvoices]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading || loadingMore || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadInvoices({ reset: false });
        }
      },
      { rootMargin: "340px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, error, loadInvoices]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${rows.length} invoice rows.`);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadInvoices({ reset: true, silent: true });
  };

  const createManualInvoice = async () => {
    const orderId = window.prompt("Optional: link to order UUID from Supabase (leave empty for standalone draft)")?.trim() ?? "";
    const amountRaw = window.prompt("Amount in EGP (optional for draft, default 0)")?.trim() ?? "";
    const amountEgp = amountRaw === "" ? 0 : Number(amountRaw);
    if (amountRaw !== "" && (!Number.isFinite(amountEgp) || amountEgp < 0)) {
      setNotice("Invalid amount.");
      return;
    }
    setCreatingInvoice(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId === "" ? null : orderId,
          amount_egp: amountEgp,
          status: "pending",
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: { en?: string; ar?: string }; ok?: boolean };
      if (!res.ok) {
        const msg = payload.error?.en ?? payload.error?.ar ?? "Failed to create invoice";
        throw new Error(msg);
      }
      setNotice("Invoice created (pending).");
      await loadInvoices({ reset: true, silent: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setNotice(`Create invoice failed: ${msg}`);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const empty = !loading && !error && rows.length === 0;

  return (
    <section className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">Invoice Lifecycle</h1>
        <p className="mt-2 text-sm text-cb-text-muted">
          Track, manage, and audit all invoices across the system.
        </p>
      </header>

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div className="grid gap-3 lg:grid-cols-12">
          <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-3">
            Status
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as FilterState["status"] }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-3">
            Customer
            <span className="relative mt-1 block">
              <Search className="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
              <input
                value={filters.customer}
                onChange={(e) => setFilters((prev) => ({ ...prev, customer: e.target.value }))}
                placeholder="Name or email"
                className="w-full rounded-xl border border-cb-border bg-cb-surface py-2 ps-9 pe-3 text-sm text-cb-text-strong"
              />
            </span>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            Date From
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            />
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
            Date To
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 lg:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted">
              Min
              <input
                type="number"
                min={0}
                value={filters.minAmount}
                onChange={(e) => setFilters((prev) => ({ ...prev, minAmount: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted">
              Max
              <input
                type="number"
                min={0}
                value={filters.maxAmount}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxAmount: e.target.value }))}
                placeholder="0"
                className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={buttonClassName("outline", "px-4 py-2 text-xs")} onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            className={buttonClassName("subtle", "px-4 py-2 text-xs")}
            disabled={creatingInvoice || loading}
            title="Create invoice via POST /api/admin/invoices (optional order UUID link)"
            onClick={() => void createManualInvoice()}
          >
            <FilePlus2 className="h-4 w-4" />
            {creatingInvoice ? "Creating…" : "Create Invoice"}
          </button>
          <button type="button" className={buttonClassName("ghost", "px-4 py-2 text-xs")} onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </button>
          <span className="ms-auto text-xs text-cb-text-muted">
            {rows.length} / {total} invoices · source: {source}
          </span>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-cb-border bg-cb-surface px-4 py-2 text-sm text-cb-text">{notice}</div>
      ) : null}

      {loading ? (
        <div className="space-y-2 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-12 animate-pulse rounded-xl bg-cb-surface-2" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-red-300/80 bg-red-50/80 p-5 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700 dark:text-red-300" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-red-900 dark:text-red-100">
                {error.includes("جدول الفواتير") || error.includes("Invoices table")
                  ? "قاعدة بيانات الفواتير غير مكتملة"
                  : "Failed to load invoices"}
              </h2>
              <p className="mt-1 text-sm text-red-800 dark:text-red-200">{error}</p>
              {error.includes("0019") ? (
                <p className="mt-2 text-xs text-red-900/90 dark:text-red-100/90" dir="rtl">
                  من Supabase SQL Editor أو محلياً:{" "}
                  <code className="rounded bg-red-100 px-1 dark:bg-red-900/50">
                    node scripts/supabase-run-migrations.mjs
                  </code>
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={buttonClassName("primary", "px-4 py-2 text-xs")} onClick={() => void loadInvoices({ reset: true })}>
                  Retry
                </button>
                <a href="/admin/audit-logs" className={buttonClassName("outline", "px-4 py-2 text-xs")}>
                  View Logs
                </a>
              </div>

              {isOwner && debug ? (
                <details className="mt-3 rounded-lg border border-red-300/70 bg-white/70 p-3 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
                  <summary className="cursor-pointer font-semibold">Owner Debug Info</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(debug, null, 2)}</pre>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {empty ? (
        <div className="rounded-2xl border border-dashed border-cb-border bg-cb-surface-elevated p-8 text-center">
          <p className="text-base font-semibold text-cb-text-strong">No invoices match current filters.</p>
          <p className="mt-1 text-sm text-cb-text-muted">Try adjusting status, customer, date range, or amount.</p>
        </div>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-cb-border bg-cb-surface-elevated md:block">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
                <tr>
                  <th className="px-4 py-3">Invoice ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <motion.tr
                    key={`${row.id}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx < 12 ? idx * 0.01 : 0 }}
                    className="cursor-pointer border-t border-cb-border transition hover:bg-cb-surface-2/70"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-cb-text-strong">{row.invoice_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-cb-text-strong">{row.customer_name ?? "Guest"}</p>
                      <p className="text-xs text-cb-text-muted">{row.customer_email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-cb-text-strong">{row.order.order_code ?? row.order.id ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-cb-text-strong">{money(row.amount_egp)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-cb-text-strong">{row.payment.status ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-cb-text-muted">{new Date(row.issued_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-end">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className={buttonClassName(
                            "ghost",
                            "min-h-0 rounded-lg px-3 py-1.5 text-xs",
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(row);
                          }}
                        >
                          Preview
                        </button>
                        <a
                          href={`/invoices/${row.invoice_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonClassName(
                            "outline",
                            "min-h-0 rounded-lg px-3 py-1.5 text-xs",
                          )}
                          onClick={(e) => e.stopPropagation()}
                          title="Open the full styled invoice in a new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <button
                key={`card-${row.id}`}
                type="button"
                className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 text-start"
                onClick={() => setSelected(row)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-cb-text-strong">{row.invoice_number}</p>
                  <StatusBadge status={row.status} />
                </div>
                <p className="mt-2 text-sm font-semibold text-cb-text-strong">{row.customer_name ?? "Guest"}</p>
                <p className="text-xs text-cb-text-muted">{row.customer_email ?? "—"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <p className="text-cb-text-muted">Amount</p>
                  <p className="text-end font-semibold text-cb-text-strong">{money(row.amount_egp)}</p>
                  <p className="text-cb-text-muted">Order</p>
                  <p className="text-end text-cb-text-strong">{row.order.order_code ?? "—"}</p>
                </div>
              </button>
            ))}
          </div>

          {hasMore ? (
            <div ref={sentinelRef} className="flex items-center justify-center py-2">
              <button
                type="button"
                className={buttonClassName("outline", "px-4 py-2 text-xs")}
                onClick={() => void loadInvoices({ reset: false })}
                disabled={loadingMore}
              >
                <RefreshCw className={cn("h-4 w-4", loadingMore && "animate-spin")} />
                {loadingMore ? "Loading more..." : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <InvoiceDrawer invoice={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </section>
  );
}

