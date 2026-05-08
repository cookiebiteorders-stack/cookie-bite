"use client";

import { FormEvent, useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type FinancialData = {
  revenue_30d_egp: number;
  expenses_total_egp: number;
  net_egp: number;
  expenses_by_category: Record<string, number>;
  expenses: Array<{
    id: string;
    title: string;
    category: string;
    amount_egp: number;
    expense_date: string;
  }>;
};

export default function AdminFinancialPage() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("operations");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/financial/summary", { cache: "no-store" });
      const d = (await res.json()) as FinancialData | { error?: { en?: string } };
      if (!res.ok) throw new Error("error" in d ? d.error?.en ?? "Failed" : "Failed");
      setData(d as FinancialData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void load();
    });
    return cancel;
  }, []);

  async function createExpense(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/financial/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        amount_egp: Number(amount),
        expense_date: expenseDate,
      }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => null)) as { error?: { en?: string } } | null;
      setError(d?.error?.en ?? "Failed to add expense");
      return;
    }
    setTitle("");
    setAmount("");
    await load();
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Financial Reports
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Revenue, expenses, and net performance with expense ledger.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-cb-text-muted">
          Loading...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Revenue 30d</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(data?.revenue_30d_egp ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Expenses</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(data?.expenses_total_egp ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Net</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(data?.net_egp ?? 0).toLocaleString()}
              </p>
            </article>
          </div>

          <form
            onSubmit={(e) => void createExpense(e)}
            className="grid gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 sm:grid-cols-4"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Expense title"
              required
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
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
              placeholder="Amount"
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
            <button
              type="submit"
              className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold sm:col-span-4"
            >
              Add Expense
            </button>
          </form>
        </>
      )}
    </section>
  );
}

