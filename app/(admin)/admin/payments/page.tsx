"use client";

import { useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type PaymentSummary = {
  kpis: {
    total_captured_egp: number;
    paid_count: number;
    failed_count: number;
    refunded_count: number;
    rows_with_gateway_tx: number;
  };
  by_status: Record<string, number>;
  recent: Array<{
    total_egp: number;
    payment_status: string;
    payment_method: string | null;
    paymob_transaction_id: string | null;
    created_at: string;
  }>;
};

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/payments/summary", { cache: "no-store" });
        const d = (await res.json()) as PaymentSummary | { error?: { en?: string } };
        if (!res.ok) throw new Error("error" in d ? d.error?.en ?? "Failed" : "Failed");
        if (!cancelled) setData(d as PaymentSummary);
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
          Payments Console
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Gateway transaction health, status distribution, and captured value.
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Captured</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">
                EGP {Math.round(data?.kpis.total_captured_egp ?? 0).toLocaleString()}
              </p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Paid</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">{data?.kpis.paid_count ?? 0}</p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Failed</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">{data?.kpis.failed_count ?? 0}</p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="text-xs font-semibold uppercase text-cb-text-muted">Refunded</p>
              <p className="mt-1 text-2xl font-bold text-cb-text-strong">{data?.kpis.refunded_count ?? 0}</p>
            </article>
          </div>

          <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
                <tr>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Gateway Tx</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent ?? []).map((r, idx) => (
                  <tr key={`${r.created_at}-${idx}`} className="border-t border-cb-border">
                    <td className="px-4 py-3">EGP {Number(r.total_egp || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{r.payment_status}</td>
                    <td className="px-4 py-3">{r.payment_method ?? "-"}</td>
                    <td className="px-4 py-3">{r.paymob_transaction_id ?? "-"}</td>
                    <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

