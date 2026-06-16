"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, CreditCard, MapPin, Package, Trash2, Truck, X } from "lucide-react";
import type { AdminOrderRow, OrderItemRow } from "@/lib/admin/orders-operations-types";
import { useOrdersOperationsStore } from "@/stores/orders-operations-store";
import { cn } from "@/lib/utils";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function timelineSteps(order: AdminOrderRow) {
  const s = order.status;
  const paid = order.payment_status === "paid";
  return [
    { key: "created", label: "إنشاء الطلب", done: true, at: order.created_at },
    {
      key: "pay",
      label: "استلام الدفع",
      done: paid,
      at: paid ? order.updated_at ?? order.created_at : null,
    },
    {
      key: "proc",
      label: "التجهيز",
      done: ["processing", "shipped", "delivered"].includes(s),
      at: null,
    },
    { key: "ship", label: "الشحن", done: ["shipped", "delivered"].includes(s), at: null },
    { key: "del", label: "التسليم", done: s === "delivered", at: s === "delivered" ? order.updated_at : null },
  ];
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string | null;
  canWrite: boolean;
  canDelete?: boolean;
};

export function OrderDetailsDrawer({
  open,
  onOpenChange,
  orderId,
  canWrite,
  canDelete = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const fetchOrderDetail = useOrdersOperationsStore((s) => s.fetchOrderDetail);
  const patchOrder = useOrdersOperationsStore((s) => s.patchOrder);
  const deleteOrder = useOrdersOperationsStore((s) => s.deleteOrder);
  const pushToast = useOrdersOperationsStore((s) => s.pushToast);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<AdminOrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [notificationLogs, setNotificationLogs] = useState<
    Array<{
      id: string;
      notification_type: string;
      channel: string;
      recipient: string;
      status: string;
      sent_at: string | null;
      created_at: string;
    }>
  >([]);
  const [resendBusy, setResendBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const res = await fetchOrderDetail(orderId);
    if (!res) {
      setOrder(null);
      setItems([]);
      pushToast("تعذر تحميل تفاصيل الطلب", "error");
    } else {
      setOrder(res.order);
      setItems(res.items ?? []);
      const ship = (res.order.shipping_address ?? {}) as Record<string, unknown>;
      setTracking(str(ship.tracking_number));
      setCourier(str(ship.courier));
      try {
        const nRes = await fetch(`/api/admin/orders/${orderId}/notifications`);
        if (nRes.ok) {
          const nJson = (await nRes.json()) as { logs?: typeof notificationLogs };
          setNotificationLogs(nJson.logs ?? []);
        } else {
          setNotificationLogs([]);
        }
      } catch {
        setNotificationLogs([]);
      }
    }
    setLoading(false);
  }, [orderId, fetchOrderDetail, pushToast]);

  const resendNotification = useCallback(
    async (type: "order_confirmation" | "payment_confirmation") => {
      if (!orderId) return;
      setResendBusy(type);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/notifications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        const json = (await res.json()) as { ok?: boolean; errors?: string[] };
        if (!res.ok || !json.ok) {
          pushToast(
            json.errors?.join(" · ") || "تعذر إرسال الإشعار",
            "error",
          );
        } else {
          pushToast("تم إرسال الإشعار", "success");
          void load();
        }
      } catch {
        pushToast("تعذر إرسال الإشعار", "error");
      } finally {
        setResendBusy(null);
      }
    },
    [orderId, load, pushToast],
  );

  useEffect(() => {
    if (!open || !orderId) return;
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, orderId, load]);

  const ship = useMemo(
    () => (order?.shipping_address ?? {}) as Record<string, unknown>,
    [order?.shipping_address],
  );

  const steps = useMemo(() => (order ? timelineSteps(order) : []), [order]);

  const saveShippingMeta = async () => {
    if (!orderId || !canWrite) return;
    const ok = await patchOrder(orderId, {
      shipping_address: {
        ...ship,
        tracking_number: tracking.trim() || null,
        courier: courier.trim() || null,
      },
    });
    if (ok) void load();
  };

  return (
    <AnimatePresence>
      {open && orderId ? (
        <motion.div
          className="fixed inset-0 z-[85] flex justify-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-drawer-title"
            initial={reduceMotion ? false : { x: 36, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "flex h-full w-full max-w-lg flex-col border-s border-cb-border bg-cb-surface shadow-2xl dark:bg-cb-surface-elevated",
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-cb-border px-5 py-4">
              <div>
                <h2 id="order-drawer-title" className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50">
                  تفاصيل الطلب
                </h2>
                <p className="mt-1 font-mono text-sm text-cb-text-muted">
                  {order?.order_code ?? orderId.slice(0, 8)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-cb-border p-2 text-cb-text-muted hover:bg-cb-surface-2 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400"
                onClick={() => onOpenChange(false)}
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-cb-surface-2" />
                  ))}
                </div>
              ) : !order ? (
                <p className="text-sm text-cb-text-muted">لا توجد بيانات.</p>
              ) : (
                <div className="space-y-6">
                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                      <MapPin className="h-4 w-4" aria-hidden />
                      العميل والعنوان
                    </h3>
                    <dl className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-cb-text-muted">البريد</dt>
                        <dd className="font-medium">{order.guest_email ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-cb-text-muted">المستلم</dt>
                        <dd className="text-end font-medium">{str(ship.recipient) || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-cb-text-muted">الهاتف</dt>
                        <dd className="font-mono">{str(ship.phone) || "—"}</dd>
                      </div>
                      <div className="pt-2 text-xs leading-relaxed text-stone-700 dark:text-stone-200">
                        {str(ship.street)}
                        {str(ship.city) ? `، ${str(ship.city)}` : ""}
                        {str(ship.governorate) ? `، ${str(ship.governorate)}` : ""}
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                      <CreditCard className="h-4 w-4" aria-hidden />
                      الدفع
                    </h3>
                    <dl className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-cb-text-muted">الحالة</dt>
                        <dd className="font-bold">{order.payment_status}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-cb-text-muted">الوسيلة</dt>
                        <dd>{order.payment_method ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-cb-text-muted">معاملة Paymob</dt>
                        <dd className="break-all font-mono text-xs">{order.paymob_transaction_id ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-cb-border pt-2">
                        <dt className="text-cb-text-muted">الإجمالي</dt>
                        <dd className="font-serif text-lg font-bold">{Number(order.total_egp).toLocaleString("ar-EG")} ج.م</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                      <Truck className="h-4 w-4" aria-hidden />
                      الشحن والتتبع
                    </h3>
                    <div className="mt-3 grid gap-2">
                      <label className="text-xs font-semibold text-cb-text-muted">
                        رقم التتبع
                        <input
                          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm dark:bg-stone-900"
                          value={tracking}
                          onChange={(e) => setTracking(e.target.value)}
                          disabled={!canWrite}
                        />
                      </label>
                      <label className="text-xs font-semibold text-cb-text-muted">
                        شركة الشحن
                        <input
                          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm dark:bg-stone-900"
                          value={courier}
                          onChange={(e) => setCourier(e.target.value)}
                          disabled={!canWrite}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => void saveShippingMeta()}
                        className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        حفظ بيانات التتبع
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                      <Package className="h-4 w-4" aria-hidden />
                      المنتجات ({items.length})
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {items.map((it) => {
                        const snap = it.product_snapshot as Record<string, unknown> | null | undefined;
                        const img = snap && typeof snap.image_url === "string" ? snap.image_url : null;
                        return (
                          <li key={it.id} className="flex gap-3 rounded-xl border border-cb-border/60 bg-cb-surface/40 p-2 dark:bg-stone-900/30">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-cb-border bg-cb-surface-2">
                              {img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={img} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-cb-text-muted">
                                  <Package className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{it.product_name}</p>
                              <p className="text-xs text-cb-text-muted">
                                الكمية {it.quantity} × {Number(it.unit_price_egp).toLocaleString("ar-EG")} ج.م
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                      <Bell className="h-4 w-4" aria-hidden />
                      الإشعارات
                    </h3>
                    {canWrite ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={resendBusy !== null}
                          onClick={() => void resendNotification("order_confirmation")}
                          className="rounded-lg border border-cb-border bg-white px-2 py-1 text-xs font-bold dark:bg-stone-900 disabled:opacity-50"
                        >
                          {resendBusy === "order_confirmation" ? "…" : "إعادة تأكيد الطلب"}
                        </button>
                        <button
                          type="button"
                          disabled={resendBusy !== null}
                          onClick={() => void resendNotification("payment_confirmation")}
                          className="rounded-lg border border-cb-border bg-white px-2 py-1 text-xs font-bold dark:bg-stone-900 disabled:opacity-50"
                        >
                          {resendBusy === "payment_confirmation" ? "…" : "إعادة تأكيد الدفع"}
                        </button>
                      </div>
                    ) : null}
                    <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto text-xs">
                      {notificationLogs.length === 0 ? (
                        <li className="text-cb-text-muted">لا سجلات بعد.</li>
                      ) : (
                        notificationLogs.map((log) => (
                          <li
                            key={log.id}
                            className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-cb-border/60 px-2 py-1.5"
                          >
                            <span className="font-medium">
                              {log.notification_type} · {log.channel}
                            </span>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-bold uppercase",
                                log.status === "sent"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : log.status === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-stone-100 text-stone-600",
                              )}
                            >
                              {log.status}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">الخط الزمني</h3>
                    <ol className="mt-3 space-y-3 border-s-2 border-amber-200 ps-4 dark:border-amber-800">
                      {steps.map((st) => (
                        <li key={st.key} className="relative text-sm">
                          <span
                            className={cn(
                              "absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-stone-900",
                              st.done ? "bg-emerald-500" : "bg-cb-surface-2",
                            )}
                          />
                          <span className={cn("font-semibold", st.done ? "text-stone-900 dark:text-stone-50" : "text-cb-text-muted")}>
                            {st.label}
                          </span>
                          {st.at ? (
                            <p className="text-xs text-cb-text-muted">{new Date(st.at).toLocaleString("ar-EG")}</p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </section>

                  {canWrite ? (
                    <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                      <p className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                        قرار الطلب (قبول / رفض)
                      </p>
                      <p className="mt-1 text-xs text-emerald-900/85 dark:text-emerald-200/80">
                        عند القبول يتم تحويل الحالة إلى <strong>processing</strong>، وعند الرفض إلى{" "}
                        <strong>cancelled</strong> مع إرسال إشعار للعميل.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                          onClick={() =>
                            void patchOrder(order.id, {
                              status: "processing",
                              note: "تم تأكيد طلبك وبدء التجهيز في المطبخ.",
                            })
                          }
                        >
                          قبول الطلب
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
                          onClick={() =>
                            void patchOrder(order.id, {
                              status: "cancelled",
                              note: "نعتذر، تم رفض الطلب. تواصل معنا لمعرفة التفاصيل.",
                            })
                          }
                        >
                          رفض الطلب
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {canWrite ? (
                    <section className="rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/40 p-4 dark:border-amber-800 dark:bg-amber-950/20">
                      <p className="text-xs font-bold text-amber-950 dark:text-amber-100">تحديث سريع للحالة</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            className="rounded-lg border border-cb-border bg-white px-2 py-1 text-xs font-bold dark:bg-stone-900"
                            onClick={() => void patchOrder(order.id, { status: st })}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {canDelete ? (
                    <section className="rounded-2xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                      <p className="text-xs font-bold text-red-900 dark:text-red-100">حذف الطلب</p>
                      <p className="mt-1 text-xs text-red-800/90 dark:text-red-200/80">
                        يُحذف الطلب وبنوده وسجل النقاط المرتبط به نهائياً.
                      </p>
                      <button
                        type="button"
                        disabled={deleteBusy}
                        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        onClick={() => {
                          const label = order.order_code ?? order.id.slice(0, 8);
                          if (
                            !confirm(
                              `حذف الطلب ${label}؟\nسيتم حذف البنود وسجل النقاط المرتبط. لا يمكن التراجع.`,
                            )
                          ) {
                            return;
                          }
                          setDeleteBusy(true);
                          void deleteOrder(order.id).then((ok) => {
                            setDeleteBusy(false);
                            if (ok) onOpenChange(false);
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        {deleteBusy ? "جاري الحذف…" : "حذف الطلب"}
                      </button>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
