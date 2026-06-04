"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChefHat, Package, RefreshCw } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import type { GiftBoxOrderSnapshot } from "@/lib/gift-box/order-snapshot";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type KitchenOrder = {
  id: string;
  order_code: string | null;
  order_number: string | number | null;
  status: string;
  payment_status: string;
  recipient_name: string | null;
  gift_box_snapshot: GiftBoxOrderSnapshot | null;
  item_count: number;
  urgent: boolean;
  scheduled_delivery_date: string | null;
  created_at: string;
  total_egp: number;
};

type ApiPayload = {
  orders: KitchenOrder[];
  counts: { pending: number; ready: number; delivered: number; urgent: number };
};

export function KitchenFulfillmentDashboard() {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchJson<ApiPayload>("/api/admin/kitchen/orders?status=all&limit=60");
      setData(res);
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "تعذر تحميل طلبات المطبخ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void load();
    });
    const id = setInterval(() => void load(), 90_000);
    return () => {
      cancel();
      clearInterval(id);
    };
  }, [load]);

  const counts = data?.counts ?? { pending: 0, ready: 0, delivered: 0, urgent: 0 };

  return (
    <section className="space-y-6 pb-16">
      <div className="admin-panel-surface rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-900/80 dark:text-amber-200/90">
              Fulfillment
            </p>
            <h1 className="mt-1 flex items-center gap-2 font-serif text-2xl font-bold text-cb-text-strong">
              <ChefHat className="h-7 w-7 text-cb-terracotta-dark" aria-hidden />
              لوحة المطبخ — صناديق الهدايا
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cb-text">
              طلبات <code className="text-xs">gift_box</code> للتجهيز اليوم. التحديث كل 90 ثانية.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className={buttonClassName("outline", "inline-flex items-center gap-2 text-sm")}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              تحديث
            </button>
            <Link href="/admin/orders" className={buttonClassName("outline", "text-sm")}>
              كل الطلبات
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBadge label="قيد التجهيز" value={counts.pending} tone="amber" />
          <StatBadge label="جاهزة للشحن" value={counts.ready} tone="green" />
          <StatBadge label="عاجلة" value={counts.urgent} tone="red" icon />
          <StatBadge label="موصّلة (اليوم)" value={counts.delivered} tone="blue" />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-cb-surface-elevated" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {(data?.orders ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-cb-border py-12 text-center text-sm text-cb-text-muted">
              لا توجد صناديق هدايا في قائمة التجهيز حالياً.
            </p>
          ) : (
            data?.orders.map((order) => (
              <KitchenOrderCard key={order.id} order={order} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

function StatBadge({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "amber" | "green" | "red" | "blue";
  icon?: boolean;
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-900 ring-amber-200/80",
    green: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
    red: "bg-red-50 text-red-900 ring-red-200/80",
    blue: "bg-sky-50 text-sky-900 ring-sky-200/80",
  };
  return (
    <div className={`rounded-xl px-4 py-3 ring-1 ${tones[tone]}`}>
      <p className="flex items-center gap-1 text-xs font-semibold opacity-80">
        {icon ? <AlertTriangle className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function KitchenOrderCard({ order }: { order: KitchenOrder }) {
  const code =
    order.order_code ??
    (order.order_number != null ? `#${order.order_number}` : order.id.slice(0, 8));
  const snap = order.gift_box_snapshot;

  return (
    <article
      className={`rounded-2xl border bg-cb-surface-elevated p-5 shadow-sm ${
        order.urgent ? "border-red-300 ring-2 ring-red-200/60" : "border-cb-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-sm font-bold text-cb-text-strong">{code}</h2>
            {order.urgent ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800">
                <AlertTriangle className="h-3 w-3" /> عاجل
              </span>
            ) : null}
            <span className="rounded-full bg-cb-cream px-2 py-0.5 text-[10px] font-semibold text-cb-text-muted">
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-cb-text">
            {order.recipient_name ?? "—"} · {order.item_count} قطعة · EGP {order.total_egp}
          </p>
          {order.scheduled_delivery_date ? (
            <p className="mt-1 text-xs text-cb-text-muted">
              التوصيل: {order.scheduled_delivery_date}
            </p>
          ) : null}
        </div>
        <Link
          href={`/admin/orders?highlight=${order.id}`}
          className={buttonClassName("outline", "text-xs")}
        >
          فتح في الطلبات
        </Link>
      </div>

      {snap?.items?.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {snap.items.map((item) => (
            <li
              key={`${item.productId}-${item.name}`}
              className="flex items-center gap-2 rounded-xl bg-cb-cream/60 px-3 py-2 text-xs"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : null}
              <span className="font-medium text-cb-text-strong">
                {item.name} ×{item.quantity}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-cb-text-muted">لا توجد تفاصيل صندوق محفوظة.</p>
      )}

      {snap?.giftMessage || snap?.msgText ? (
        <blockquote className="mt-3 rounded-xl border border-cb-border/60 bg-cb-cream px-3 py-2 text-sm italic text-cb-text">
          {snap.giftMessage ?? snap.msgText}
        </blockquote>
      ) : null}
    </article>
  );
}
