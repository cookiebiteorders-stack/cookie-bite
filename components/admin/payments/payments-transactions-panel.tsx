"use client";

import { Fragment, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { motion } from "motion/react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import type { PaymentTransactionRow } from "@/lib/payments/payment-summary-types";
import { inferGateway } from "@/lib/payments/infer-gateway";
import { maskEmail, maskTransactionId, shortId } from "@/lib/payments/mask-pii";
import { transactionsToCsv } from "@/lib/payments/export-transactions-csv";
import { usePaymentsConsoleStore } from "@/stores/payments-console-store";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<PaymentTransactionRow>();

function statusBadge(status: string) {
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-800",
    failed: "bg-red-100 text-red-900 ring-1 ring-red-300 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-800",
    unpaid: "bg-amber-100 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800",
    refunded: "bg-slate-200 text-slate-900 ring-1 ring-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700",
  };
  return map[s] ?? "bg-cb-surface-2 text-cb-text-strong ring-1 ring-cb-border";
}

type Props = {
  rows: PaymentTransactionRow[];
};

export function PaymentsTransactionsPanel({ rows }: Props) {
  const pushToast = usePaymentsConsoleStore((s) => s.pushToast);
  const liveMode = usePaymentsConsoleStore((s) => s.liveMode);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const methods = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.payment_method) set.add(r.payment_method);
    });
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.payment_status !== statusFilter) return false;
      if (methodFilter !== "all" && (r.payment_method ?? "") !== methodFilter) return false;
      if (from) {
        const t = new Date(r.created_at).getTime();
        if (t < new Date(from).setHours(0, 0, 0, 0)) return false;
      }
      if (to) {
        const t = new Date(r.created_at).getTime();
        if (t > new Date(to).setHours(23, 59, 59, 999)) return false;
      }
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        (r.guest_email ?? "").toLowerCase().includes(q) ||
        (r.order_code ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, methodFilter, from, to]);

  const exportCsv = () => {
    const blob = new Blob([transactionsToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Exported filtered rows (sensitive fields masked in UI only).", "success");
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "exp",
        size: 36,
        header: () => <span className="sr-only">Expand</span>,
        cell: ({ row }) => (
          <button
            type="button"
            className="rounded-lg p-1 text-cb-text-muted hover:bg-cb-hover-overlay"
            aria-expanded={expanded === row.original.id}
            onClick={() => setExpanded((e) => (e === row.original.id ? null : row.original.id))}
          >
            {expanded === row.original.id ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ),
      }),
      columnHelper.accessor("id", {
        header: "Transaction",
        cell: (ctx) => (
          <div className="font-mono text-xs">
            <span className="font-semibold text-cb-text-strong">{shortId(ctx.getValue(), 10)}</span>
            {ctx.row.original.order_code ? (
              <p className="text-[10px] text-cb-text-muted">#{ctx.row.original.order_code}</p>
            ) : null}
          </div>
        ),
      }),
      columnHelper.display({
        id: "user",
        header: "Customer",
        cell: ({ row }) => (
          <div className="text-xs">
            <p className="font-medium text-cb-text-strong">{maskEmail(row.original.guest_email)}</p>
            {row.original.user_id ? (
              <p className="text-[10px] text-cb-text-muted">User linked</p>
            ) : (
              <p className="text-[10px] text-cb-text-muted">Guest</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("total_egp", {
        header: "Amount",
        cell: (ctx) => (
          <span className="tabular-nums font-semibold text-cb-text-strong">
            EGP {Number(ctx.getValue()).toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor("payment_status", {
        header: "Status",
        cell: (ctx) => (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
              statusBadge(ctx.getValue()),
            )}
          >
            {ctx.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("payment_method", {
        header: "Method",
        cell: (ctx) => (
          <span className="text-xs text-cb-text">{ctx.getValue() ?? "—"}</span>
        ),
      }),
      columnHelper.display({
        id: "gateway",
        header: "Gateway",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-cb-text-strong">{inferGateway(row.original)}</span>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Date",
        cell: (ctx) => (
          <span className="whitespace-nowrap text-xs text-cb-text-muted">
            {new Date(ctx.getValue()).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1">
            <button
              type="button"
              className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold"
              onClick={() => setExpanded((e) => (e === row.original.id ? null : row.original.id))}
            >
              Details
            </button>
            <button
              type="button"
              className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold opacity-80"
              onClick={() =>
                pushToast(
                  liveMode
                    ? "Refund flow is not wired to Paymob in this UI — use the gateway dashboard."
                    : "Test mode: refunds are disabled in the console preview.",
                  "info",
                )
              }
            >
              Refund
            </button>
            <button
              type="button"
              className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-bold opacity-80"
              onClick={() =>
                pushToast("Retry is initiated by the customer checkout session or webhook replay.", "info")
              }
            >
              Retry
            </button>
          </div>
        ),
      }),
    ],
    [expanded, liveMode, pushToast],
  );

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table returns non-memoizable helpers */
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });
  /* eslint-enable react-hooks/incompatible-library */

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-cb-text-strong">Transactions</h2>
          <p className="text-sm text-cb-text-muted">
            Search by order id, code, or email. Expand a row for masked diagnostics.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-4 py-2 text-sm font-bold shadow-sm"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 lg:grid-cols-5">
        <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted lg:col-span-2">
          Search
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, email, order code…"
              className="w-full rounded-xl border border-cb-border bg-cb-surface py-2 ps-9 pe-3 text-sm text-cb-text-strong"
            />
          </span>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="unpaid">Unpaid</option>
            <option value="refunded">Refunded</option>
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted">
          Method
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong"
          >
            <option value="all">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 lg:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-2 py-2 text-sm text-cb-text-strong"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-cb-text-muted">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-2 py-2 text-sm text-cb-text-strong"
            />
          </label>
        </div>
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-cb-border bg-cb-surface-elevated md:block">
        <table data-cb-zebra="true" className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-cb-border bg-cb-surface-2/80 text-xs font-bold uppercase tracking-wide text-cb-text-strong">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-3 py-3">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className={cn(
                    "border-t border-cb-border transition-colors",
                    expanded === row.original.id && "bg-cb-peach/10",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expanded === row.original.id && (
                  <tr className="border-t border-cb-border bg-cb-surface/80">
                    <td colSpan={row.getVisibleCells().length} className="px-4 py-3">
                      <pre className="max-h-48 overflow-auto rounded-xl bg-cb-surface-2 p-3 font-mono text-[11px] leading-relaxed text-cb-text">
                        {JSON.stringify(
                          {
                            ...row.original,
                            guest_email: maskEmail(row.original.guest_email),
                            paymob_transaction_id: maskTransactionId(row.original.paymob_transaction_id),
                            user_id: row.original.user_id ? shortId(row.original.user_id, 12) : null,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((r) => (
          <motion.div
            key={r.id}
            layout
            className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs font-bold text-cb-text-strong">{shortId(r.id, 10)}</p>
                <p className="text-xs text-cb-text-muted">{maskEmail(r.guest_email)}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", statusBadge(r.payment_status))}>
                {r.payment_status}
              </span>
            </div>
            <p className="mt-2 font-semibold text-cb-text-strong">EGP {r.total_egp.toFixed(2)}</p>
            <p className="mt-1 text-xs text-cb-text-muted">
              {r.payment_method ?? "—"} · {inferGateway(r)}
            </p>
            <p className="mt-1 text-[11px] text-cb-text-muted">{new Date(r.created_at).toLocaleString()}</p>
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cb-terracotta-dark"
              onClick={() => setExpanded((e) => (e === r.id ? null : r.id))}
            >
              <RefreshCw className="h-3 w-3" />
              Toggle details
            </button>
            {expanded === r.id && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-cb-surface-2 p-2 font-mono text-[10px]">
                {JSON.stringify(
                  {
                    ...r,
                    guest_email: maskEmail(r.guest_email),
                    paymob_transaction_id: maskTransactionId(r.paymob_transaction_id),
                    user_id: r.user_id ? shortId(r.user_id, 12) : null,
                  },
                  null,
                  2,
                )}
              </pre>
            )}
          </motion.div>
        ))}
      </div>

      {!filtered.length && (
        <p className="rounded-xl border border-dashed border-cb-border px-4 py-6 text-center text-sm text-cb-text-muted">
          No transactions match your filters.
        </p>
      )}
    </section>
  );
}
