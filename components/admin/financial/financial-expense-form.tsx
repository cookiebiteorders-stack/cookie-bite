"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { useFinancialDashboardStore } from "@/stores/financial-dashboard-store";

export function FinancialExpenseForm() {
  const loadSummary = useFinancialDashboardStore((s) => s.loadSummary);
  const pushToast = useFinancialDashboardStore((s) => s.pushToast);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("operations");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetchJson<{ ok: true }>("/api/admin/financial/summary", {
        method: "POST",
        jsonBody: {
          title,
          category,
          amount_egp: Number(amount),
          expense_date: expenseDate,
          notes: notes.trim() || undefined,
        },
      });
      setTitle("");
      setAmount("");
      setNotes("");
      pushToast("Expense recorded", "success");
      await loadSummary();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to add expense", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm"
    >
      <h2 className="font-serif text-lg font-bold text-cb-text-strong">Quick expense entry</h2>
      <p className="mt-1 text-xs text-cb-text-muted">Requires write access on the financial module.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm lg:col-span-2"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount EGP"
          required
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm sm:col-span-2 lg:col-span-5"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cb-terracotta-dark py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 sm:w-auto sm:px-8"
      >
        <Plus className="h-4 w-4" />
        {busy ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}
