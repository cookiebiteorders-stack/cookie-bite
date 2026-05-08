"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Customer = {
  id: string;
  email: string;
  full_name: string | null;
  points: number;
  created_at: string;
  total_orders: number;
  total_spent_egp: number;
  last_order_at: string | null;
  loyalty_tier: "bronze" | "silver" | "gold" | "platinum";
};

type CustomersResponse = {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  segments: {
    new_customers: number;
    returning: number;
    vip: number;
    at_risk: number;
  };
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState({
    new_customers: 0,
    returning: 0,
    vip: 0,
    at_risk: 0,
  });

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as
        | CustomersResponse
        | { error?: { en?: string } };

      if (!res.ok) {
        throw new Error(
          "error" in data && data.error?.en
            ? data.error.en
            : "Failed to load customers",
        );
      }

      const typed = data as CustomersResponse;
      setCustomers(typed.customers ?? []);
      setTotal(typed.total ?? 0);
      setSegments(
        typed.segments ?? {
          new_customers: 0,
          returning: 0,
          vip: 0,
          at_risk: 0,
        },
      );
    } catch (err) {
      setCustomers([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [limit, page, search]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void load();
    });
    return cancel;
  }, [load]);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Customer Management & CRM
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Live customer profiles, loyalty tiers, segmentation, and retention signals.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">
            New Customers
          </p>
          <p className="mt-1 text-2xl font-bold text-cb-text-strong">
            {segments.new_customers}
          </p>
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">
            Returning
          </p>
          <p className="mt-1 text-2xl font-bold text-cb-text-strong">
            {segments.returning}
          </p>
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">
            VIP (Gold+)
          </p>
          <p className="mt-1 text-2xl font-bold text-cb-text-strong">{segments.vip}</p>
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">
            At-Risk
          </p>
          <p className="mt-1 text-2xl font-bold text-cb-text-strong">
            {segments.at_risk}
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by name or email"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setPage(1);
            }}
            className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cb-border">
            <thead className="bg-cb-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Spent</th>
                <th className="px-4 py-3">Last Order</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cb-border text-sm text-cb-text">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-cb-text-muted" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-4 text-red-600" colSpan={7}>
                    {error}
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-cb-text-muted" colSpan={7}>
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{c.full_name ?? "Unnamed"}</p>
                      <p className="text-xs text-cb-text-muted">{c.email}</p>
                    </td>
                    <td className="px-4 py-3">{c.loyalty_tier}</td>
                    <td className="px-4 py-3">{c.points}</td>
                    <td className="px-4 py-3">{c.total_orders}</td>
                    <td className="px-4 py-3">
                      EGP {Number(c.total_spent_egp || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {c.last_order_at
                        ? new Date(c.last_order_at).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-cb-border bg-cb-surface-elevated px-4 py-3 text-sm">
        <p className="text-cb-text-muted">
          Page {page} / {totalPages} - Total customers: {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

