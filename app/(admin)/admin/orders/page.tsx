"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

type PaymentStatus = "unpaid" | "paid" | "failed" | "refunded";

type AdminOrder = {
  id: string;
  order_code: string | null;
  guest_email: string | null;
  total_egp: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
};

type OrdersResponse = {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const o of orders) c[o.status] += 1;
    return c;
  }, [orders]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (paymentFilter) params.set("payment_status", paymentFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as OrdersResponse | { error?: { en?: string } };
      if (!res.ok) {
        throw new Error(
          "error" in data && data.error?.en
            ? data.error.en
            : "Failed to load orders",
        );
      }

      const typed = data as OrdersResponse;
      setOrders(typed.orders ?? []);
      setTotal(typed.total ?? 0);
      setSelected(new Set());
    } catch (err) {
      setOrders([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, paymentFilter, statusFilter]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void fetchOrders();
    });
    return cancel;
  }, [fetchOrders]);

  function toggleSelection(orderId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function toggleAllVisible() {
    if (orders.length === 0) return;
    const allSelected = orders.every((o) => selected.has(o.id));
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(orders.map((o) => o.id)));
  }

  async function applyBulkStatus(status: OrderStatus) {
    if (selected.size === 0) return;
    setUpdating(true);
    setError(null);
    try {
      const ids = Array.from(selected);
      const requests = ids.map((id) =>
        fetch(`/api/admin/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      );
      const responses = await Promise.all(requests);
      const hasFailure = responses.some((r) => !r.ok);
      if (hasFailure) {
        throw new Error("Some orders failed to update");
      }
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Order Operations Board
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Live order queue with filters and bulk status updates.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">Pending</p>
          <p className="mt-1 text-2xl font-bold text-[var(--cb-warning)]">{counts.pending}</p>
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">Processing</p>
          <p className="mt-1 text-2xl font-bold text-[var(--cb-warning)]">{counts.processing}</p>
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <p className="text-xs font-semibold uppercase text-cb-text-muted">Shipped</p>
          <p className="mt-1 text-2xl font-bold text-[var(--cb-info)]">{counts.shipped}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPage(1);
              setPaymentFilter(e.target.value);
            }}
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          >
            <option value="">All payments</option>
            <option value="unpaid">unpaid</option>
            <option value="paid">paid</option>
            <option value="failed">failed</option>
            <option value="refunded">refunded</option>
          </select>

          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>

          <select
            disabled={selected.size === 0 || updating}
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              void applyBulkStatus(e.target.value as OrderStatus);
              e.currentTarget.value = "";
            }}
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Bulk status ({selected.size})</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                Set {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cb-border">
            <thead className="bg-cb-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && orders.every((o) => selected.has(o.id))}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Date</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-cb-text-muted" colSpan={7}>
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleSelection(order.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {order.order_code ?? order.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">{order.guest_email ?? "-"}</td>
                    <td className="px-4 py-3">EGP {Number(order.total_egp || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{order.status}</td>
                    <td className="px-4 py-3">{order.payment_status}</td>
                    <td className="px-4 py-3">
                      {new Date(order.created_at).toLocaleString()}
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
          Page {page} / {totalPages} - Total orders: {total}
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

