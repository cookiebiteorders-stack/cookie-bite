"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Download, Pencil, Trash2, Copy } from "lucide-react";
import type { LedgerEntry } from "@/lib/financial/types";
import { ledgerToCsv } from "@/lib/financial/export-ledger-csv";
import { fetchJson } from "@/lib/http/fetch-json";
import { useFinancialDashboardStore } from "@/stores/financial-dashboard-store";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<LedgerEntry>();

type Props = { ledger: LedgerEntry[] };

export function FinancialLedgerTable({ ledger }: Props) {
  const loadSummary = useFinancialDashboardStore((s) => s.loadSummary);
  const pushToast = useFinancialDashboardStore((s) => s.pushToast);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledger.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (from && r.ledger_date < from) return false;
      if (to && r.ledger_date > to) return false;
      if (!q) return true;
      return (
        r.category.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [ledger, search, typeFilter, from, to]);

  const duplicateRow = useCallback(
    async (r: LedgerEntry) => {
      try {
        await fetchJson("/api/admin/financial/summary", {
          method: "POST",
          jsonBody: {
            title: `${r.title} (copy)`,
            category: r.category,
            amount_egp: r.amount_egp,
            expense_date: r.ledger_date,
            notes: r.notes ?? undefined,
          },
        });
        pushToast("Expense duplicated", "success");
        await loadSummary();
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Duplicate failed", "error");
      }
    },
    [loadSummary, pushToast],
  );

  const deleteRow = useCallback(
    async (r: LedgerEntry) => {
      if (!window.confirm("Delete this expense permanently?")) return;
      try {
        await fetchJson(`/api/admin/financial/expenses/${r.id}`, { method: "DELETE" });
        pushToast("Expense deleted", "success");
        await loadSummary();
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "Delete failed", "error");
      }
    },
    [loadSummary, pushToast],
  );

  const saveEdit = useCallback(async () => {
    if (!editing || editing.source !== "expense") return;
    try {
      await fetchJson(`/api/admin/financial/expenses/${editing.id}`, {
        method: "PATCH",
        jsonBody: {
          title: editing.title,
          category: editing.category,
          amount_egp: editing.amount_egp,
          expense_date: editing.ledger_date,
          notes: editing.notes,
        },
      });
      setEditing(null);
      pushToast("Expense updated", "success");
      await loadSummary();
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "Update failed", "error");
    }
  }, [editing, loadSummary, pushToast]);

  const exportCsv = () => {
    const blob = new Blob([ledgerToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Ledger exported (CSV). For PDF, use browser print on this table.", "success");
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "exp",
        header: "",
        size: 36,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-cb-text-muted hover:text-cb-text-strong"
            onClick={() => setExpanded((e) => (e === row.original.id ? null : row.original.id))}
          >
            {expanded === row.original.id ? "▼" : "▶"}
          </button>
        ),
      }),
      columnHelper.accessor("ledger_date", { header: "Date" }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (ctx) => (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
              ctx.getValue() === "income"
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                : "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100",
            )}
          >
            {ctx.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("category", { header: "Category" }),
      columnHelper.accessor("title", { header: "Title" }),
      columnHelper.accessor("amount_egp", {
        header: "Amount",
        cell: (ctx) => (
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums",
              ctx.row.original.type === "income" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
            )}
          >
            {ctx.row.original.type === "income" ? "+" : "-"}EGP {Math.abs(ctx.getValue()).toLocaleString()}
          </span>
        ),
      }),
      columnHelper.accessor("status", { header: "Status" }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          if (r.source !== "expense") {
            return <span className="text-[10px] text-cb-text-muted">Aggregated</span>;
          }
          return (
            <div className="flex flex-wrap justify-end gap-1">
              <button
                type="button"
                className="rounded-lg border border-cb-border p-1.5 hover:bg-cb-hover-overlay"
                title="Edit"
                onClick={() => setEditing({ ...r })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-cb-border p-1.5 hover:bg-cb-hover-overlay"
                title="Duplicate"
                onClick={() => {
                  void duplicateRow(r);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                title="Delete"
                onClick={() => {
                  void deleteRow(r);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      }),
    ],
    [expanded, duplicateRow, deleteRow],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-cb-text-strong">Ledger</h2>
          <p className="text-sm text-cb-text-muted">Income rows are daily paid-order aggregates; expenses are editable.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-4 py-2 text-sm font-bold"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 lg:grid-cols-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search category, title, notes…"
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm lg:col-span-2"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border border-cb-border bg-cb-surface px-2 py-2 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border border-cb-border bg-cb-surface px-2 py-2 text-sm" />
        </div>
      </div>

      {editing && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-bold text-cb-text-strong">Edit expense</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <input
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
            />
            <input
              type="number"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              value={editing.amount_egp}
              onChange={(e) => setEditing({ ...editing, amount_egp: Number(e.target.value) })}
            />
            <input
              type="date"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              value={editing.ledger_date}
              onChange={(e) => setEditing({ ...editing, ledger_date: e.target.value })}
            />
            <input
              className="sm:col-span-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              value={editing.notes ?? ""}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })}
              placeholder="Notes"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white"
              onClick={() => {
                void saveEdit();
              }}
            >
              Save
            </button>
            <button type="button" className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-2xl border border-cb-border bg-cb-surface-elevated md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-cb-border bg-cb-surface-2/80 text-xs font-bold uppercase text-cb-text-muted">
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
                    "border-t border-cb-border hover:bg-cb-hover-overlay/40",
                    row.original.type === "income" ? "bg-emerald-50/20 dark:bg-emerald-950/10" : "bg-red-50/10 dark:bg-red-950/10",
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
                      <pre className="max-h-40 overflow-auto rounded-xl bg-cb-surface-2 p-3 font-mono text-[11px]">
                        {JSON.stringify(row.original, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 md:hidden">
        {filtered.map((r) => (
          <div
            key={r.id}
            className={cn(
              "rounded-2xl border border-cb-border p-4 text-sm",
              r.type === "income" ? "bg-emerald-50/30 dark:bg-emerald-950/15" : "bg-red-50/20 dark:bg-red-950/15",
            )}
          >
            <div className="flex justify-between gap-2">
              <span className="text-xs text-cb-text-muted">{r.ledger_date}</span>
              <span className="text-[11px] font-bold uppercase">{r.type}</span>
            </div>
            <p className="mt-1 font-semibold text-cb-text-strong">{r.title}</p>
            <p className="text-xs text-cb-text-muted">{r.category}</p>
            <p className="mt-2 font-mono font-bold">
              {r.type === "income" ? "+" : "-"}EGP {Math.abs(r.amount_egp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
