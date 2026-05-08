"use client";

import { useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Invoice = {
  id: string;
  invoice_number: string;
  order_code: string | null;
  amount_egp: number;
  payment_status: string;
  order_status: string;
  issue_date: string;
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/invoices", { cache: "no-store" });
        const d = (await res.json()) as { invoices?: Invoice[]; error?: { en?: string } };
        if (!res.ok) throw new Error(d.error?.en ?? "Failed to load invoices");
        if (!cancelled) setInvoices(d.invoices ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const cancelSchedule = scheduleEffectTask(() => {
      void load();
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, []);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Invoice Lifecycle
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Generated invoice records from order flow with payment linkage.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Order Status</th>
              <th className="px-4 py-3">Issued</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-3 text-red-600" colSpan={6}>
                  {error}
                </td>
              </tr>
            ) : (
              invoices.map((i) => (
                <tr key={i.id} className="border-t border-cb-border">
                  <td className="px-4 py-3 font-semibold">{i.invoice_number}</td>
                  <td className="px-4 py-3">{i.order_code ?? "-"}</td>
                  <td className="px-4 py-3">EGP {Number(i.amount_egp || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{i.payment_status}</td>
                  <td className="px-4 py-3">{i.order_status}</td>
                  <td className="px-4 py-3">{new Date(i.issue_date).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

