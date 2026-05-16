"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";

type TrackResult = {
  order_code: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_egp: number;
  created_at: string;
  updated_at: string | null;
  tracking_number: string | null;
  courier: string | null;
  recipient_name: string | null;
  city: string | null;
};

const STATUS_AR: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغى",
  refunded: "مسترد",
};

export function OrderTrackForm({
  initialOrder,
  initialEmail,
}: {
  initialOrder?: string;
  initialEmail?: string;
}) {
  const [order, setOrder] = useState(initialOrder ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const params = new URLSearchParams({
        order: order.replace(/^#/, ""),
        email: email.trim(),
      });
      const res = await fetch(`/api/orders/public-track?${params}`);
      const json = (await res.json()) as { ok?: boolean; order?: TrackResult; error?: string };
      if (!res.ok || !json.ok || !json.order) {
        setError("لم نجد طلباً بهذه البيانات. تحقق من رقم الطلب والبريد.");
        return;
      }
      setResult(json.order);
    } catch {
      setError("تعذر الاتصال. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-cb-border bg-white/90 p-6 text-start dark:bg-stone-900/50">
        <label className="block text-sm font-semibold text-cb-text-strong">
          رقم الطلب
          <input
            required
            className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm dark:bg-stone-900"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            placeholder="مثال: 1042"
          />
        </label>
        <label className="block text-sm font-semibold text-cb-text-strong">
          البريد الإلكتروني
          <input
            required
            type="email"
            className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm dark:bg-stone-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className={buttonClassName("primary", "w-full rounded-full py-3 disabled:opacity-60")}
        >
          {loading ? "جاري البحث…" : "عرض حالة الطلب"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {result ? (
        <div className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 text-start dark:border-amber-900 dark:bg-amber-950/30">
          <p className="font-mono text-sm font-bold text-cb-terracotta-dark">{result.order_code}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-cb-text-muted">الحالة</dt>
              <dd className="font-semibold">{STATUS_AR[result.status] ?? result.status}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-cb-text-muted">الدفع</dt>
              <dd>{result.payment_status}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-cb-text-muted">الإجمالي</dt>
              <dd className="font-bold">{Number(result.total_egp).toLocaleString("ar-EG")} ج.م</dd>
            </div>
            {result.tracking_number ? (
              <div className="flex justify-between gap-2">
                <dt className="text-cb-text-muted">التتبع</dt>
                <dd className="font-mono text-xs">{result.tracking_number}</dd>
              </div>
            ) : null}
            {result.courier ? (
              <div className="flex justify-between gap-2">
                <dt className="text-cb-text-muted">شركة الشحن</dt>
                <dd>{result.courier}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-4 text-xs text-cb-text-muted">
            آخر تحديث:{" "}
            {new Date(result.updated_at ?? result.created_at).toLocaleString("ar-EG")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
