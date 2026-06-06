"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Ban, Gift, MapPin, ShieldAlert, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import type { CustomerDetailResponse, OrderSummaryRow } from "@/lib/admin/crm-types";
import { useCustomersCrmStore } from "@/stores/customers-crm-store";
import { cn } from "@/lib/utils";
import {
  CustomerModerationDialog,
  type ModerationDialogKind,
} from "@/components/admin/customers/customer-moderation-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string | null;
  canWrite: boolean;
  canDelete: boolean;
};

export function CustomerProfileDrawer({
  open,
  onOpenChange,
  customerId,
  canWrite,
  canDelete,
}: Props) {
  const reduceMotion = useReducedMotion();
  const fetchCustomerDetail = useCustomersCrmStore((s) => s.fetchCustomerDetail);
  const patchCustomer = useCustomersCrmStore((s) => s.patchCustomer);
  const blockCustomerEmail = useCustomersCrmStore((s) => s.blockCustomerEmail);
  const unblockCustomerEmail = useCustomersCrmStore((s) => s.unblockCustomerEmail);
  const deleteCustomer = useCustomersCrmStore((s) => s.deleteCustomer);
  const pushToast = useCustomersCrmStore((s) => s.pushToast);

  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [detail, setDetail] = useState<CustomerDetailResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [points, setPoints] = useState("");
  const [notes, setNotes] = useState("");
  const [dialogKind, setDialogKind] = useState<ModerationDialogKind | null>(null);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    const res = await fetchCustomerDetail(customerId);
    if (!res) {
      setDetail(null);
      pushToast("تعذر تحميل الملف", "error");
    } else {
      setDetail(res);
      setFullName(res.customer.full_name ?? "");
      setPoints(String(res.customer.points));
      setNotes(res.admin_notes ?? "");
    }
    setLoading(false);
  }, [customerId, fetchCustomerDetail, pushToast]);

  useEffect(() => {
    if (!open || !customerId) return;
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [open, customerId, load]);

  const c = detail?.customer;
  const orders = detail?.orders ?? [];
  const addresses = detail?.addresses ?? [];

  const saveProfile = async () => {
    if (!customerId || !canWrite) return;
    const p = Number(points);
    if (!Number.isFinite(p) || p < 0) {
      pushToast("نقاط غير صالحة", "error");
      return;
    }
    const ok = await patchCustomer(customerId, {
      full_name: fullName.trim() || "Customer",
      points: Math.floor(p),
    });
    if (ok) void load();
  };

  const aiInsight = () => {
    if (!c) return;
    const msg =
      c.total_orders >= 3 && c.total_spent_egp > 2000
        ? "عميل عالي القيمة — جرّب باقة VIP أو هدية مجانية."
        : c.total_orders === 0
          ? "لا طلبات بعد — أرسل ترحيباً بكوبون أول طلب."
          : "فرصة ترقية: قدّم نقاط مضاعفة على الفئة التالية.";
    pushToast(msg, "info");
  };

  const saveNotes = async () => {
    if (!customerId || !canWrite) return;
    const ok = await patchCustomer(customerId, { admin_notes: notes });
    if (ok) void load();
  };

  const handleModerationConfirm = async (payload: {
    confirmEmail: string;
    reason?: string;
  }) => {
    if (!customerId || !canDelete || !dialogKind) return;

    setModerating(true);
    let ok = false;

    if (dialogKind === "delete" && c?.email) {
      ok = await deleteCustomer(customerId, {
        confirm_email: payload.confirmEmail,
      });
      if (ok) {
        setDialogKind(null);
        onOpenChange(false);
      }
    } else if (dialogKind === "block" && c?.email) {
      ok = await blockCustomerEmail(customerId, {
        confirm_email: payload.confirmEmail,
        reason: payload.reason,
      });
      if (ok) {
        setDialogKind(null);
        onOpenChange(false);
      }
    } else if (dialogKind === "unblock") {
      ok = await unblockCustomerEmail(customerId);
      if (ok) {
        setDialogKind(null);
        void load();
      }
    }

    setModerating(false);
  };

  return (
    <AnimatePresence>
      {open && customerId ? (
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
            aria-labelledby="crm-drawer-title"
            initial={reduceMotion ? false : { x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? undefined : { x: 28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className={cn(
              "flex h-full w-full max-w-lg flex-col border-s border-cb-border bg-cb-surface shadow-2xl dark:bg-cb-surface-elevated",
            )}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-cb-border px-5 py-4">
              <div className="flex gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cb-border bg-amber-50 text-lg font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                  {c?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (c?.full_name ?? c?.email ?? "?").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 id="crm-drawer-title" className="font-serif text-xl font-bold text-stone-900 dark:text-stone-50">
                    ملف العميل
                  </h2>
                  <p className="text-xs text-cb-text-muted">{c?.email}</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl border border-cb-border p-2 text-cb-text-muted hover:bg-cb-surface-2"
                onClick={() => onOpenChange(false)}
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-cb-surface-2" />
                  ))}
                </div>
              ) : !c ? (
                <p className="text-sm text-cb-text-muted">لا بيانات.</p>
              ) : (
                <div className="space-y-5">
                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">نظرة عامة</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <dt className="text-cb-text-muted">الطلبات</dt>
                        <dd className="font-bold">{c.total_orders}</dd>
                      </div>
                      <div>
                        <dt className="text-cb-text-muted">الإنفاق</dt>
                        <dd className="font-mono font-bold">{c.total_spent_egp.toLocaleString("ar-EG")} ج.م</dd>
                      </div>
                      <div>
                        <dt className="text-cb-text-muted">النقاط</dt>
                        <dd className="font-bold">{c.points}</dd>
                      </div>
                      <div>
                        <dt className="text-cb-text-muted">المستوى</dt>
                        <dd className="font-bold">{c.loyalty_tier}</dd>
                      </div>
                    </dl>
                  </section>

                  {canWrite ? (
                    <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">تعديل سريع</h3>
                      <label className="mt-2 block text-xs font-semibold text-cb-text-muted">
                        الاسم الكامل
                        <input
                          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm dark:bg-stone-900"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </label>
                      <label className="mt-2 block text-xs font-semibold text-cb-text-muted">
                        النقاط
                        <input
                          className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm dark:bg-stone-900"
                          inputMode="numeric"
                          value={points}
                          onChange={(e) => setPoints(e.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveProfile()}
                        className="mt-3 w-full rounded-xl bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-700"
                      >
                        حفظ
                      </button>
                    </section>
                  ) : null}

                  <section className="rounded-2xl border border-dashed border-violet-300/80 bg-violet-50/40 p-4 dark:border-violet-800 dark:bg-violet-950/20">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet-900 dark:text-violet-100">
                        <StickyNote className="h-4 w-4" aria-hidden />
                        ملاحظات CRM
                      </h3>
                      <button type="button" className="text-xs font-bold text-violet-800 underline dark:text-violet-200" onClick={aiInsight}>
                        <Sparkles className="me-1 inline h-3.5 w-3.5" />
                        رؤى AI
                      </button>
                    </div>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-xl border border-cb-border bg-white px-3 py-2 text-sm dark:bg-stone-900"
                      placeholder="ملاحظات داخلية للفريق — تُحفظ في قاعدة البيانات."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!canWrite}
                    />
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => void saveNotes()}
                        className="mt-2 w-full rounded-xl border border-violet-400 bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-700"
                      >
                        حفظ الملاحظات
                      </button>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cb-text-muted">
                      <Gift className="h-4 w-4" aria-hidden />
                      الولاء
                    </h3>
                    <p className="mt-2 text-sm text-stone-800 dark:text-stone-100">
                      النقاط الحالية تدفع الترقية التلقائية بين Bronze → Platinum. برامج الاسترداد والكوبونات تتطلب
                      endpoints إضافية.
                    </p>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">العناوين</h3>
                    {addresses.length === 0 ? (
                      <p className="mt-2 text-sm text-cb-text-muted">لا عناوين محفوظة.</p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-sm">
                        {addresses.map((a) => (
                          <li key={a.id} className="rounded-xl border border-cb-border/60 bg-cb-surface/40 p-2 dark:bg-stone-900/30">
                            <p className="flex items-center gap-1 font-semibold">
                              <MapPin className="h-3.5 w-3.5 text-cb-text-muted" aria-hidden />
                              {a.recipient}
                            </p>
                            <p className="text-xs text-cb-text-muted">{a.phone}</p>
                            <p className="text-xs">{a.street}، {a.city}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">سجل الطلبات</h3>
                    <ol className="mt-2 space-y-2 border-s-2 border-amber-200 ps-3 dark:border-amber-800">
                      <li className="text-xs text-cb-text-muted">
                        <span className="font-bold text-stone-800 dark:text-stone-100">تسجيل</span> —{" "}
                        {new Date(c.created_at).toLocaleString("ar-EG")}
                      </li>
                      {orders.map((o: OrderSummaryRow) => (
                        <li key={o.id} className="text-xs">
                          <span className="font-bold text-stone-800 dark:text-stone-100">طلب {o.order_code ?? o.id.slice(0, 8)}</span> —{" "}
                          {Number(o.total_egp).toLocaleString("ar-EG")} ج.م — {o.status}
                          <span className="block text-cb-text-muted">{new Date(o.created_at).toLocaleString("ar-EG")}</span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className="rounded-2xl border border-cb-border bg-white/90 p-4 dark:bg-stone-900/50">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">تفضيلات تسويقية (واجهة)</h3>
                    <p className="mt-2 text-xs text-cb-text-muted">
                      بريد تسويقي: مفعّل (وهمي) · SMS: اطلب موافقة صريحة · اللغة: حسب الموقع.
                    </p>
                  </section>

                  {canDelete ? (
                    <section className="rounded-2xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-red-800 dark:text-red-200">
                        <ShieldAlert className="h-4 w-4" aria-hidden />
                        إجراءات حساسة
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-red-900/80 dark:text-red-100/80">
                        للمالك والأدمن فقط. <strong>الحذف</strong> يزيل الملف فقط ويمكن للعميل التسجيل مجدداً.
                        <strong> الحظر</strong> يحظر البريد ويحذف الحساب معاً. الطلبات السابقة تبقى دائماً.
                      </p>

                      {detail.email_blocked ? (
                        <div className="mt-3 rounded-xl border border-red-300/70 bg-white/80 px-3 py-2 text-xs text-red-900 dark:bg-stone-900/40 dark:text-red-100">
                          <p className="font-bold">البريد محظور</p>
                          {detail.blocked_reason ? (
                            <p className="mt-1 text-red-800/90 dark:text-red-100/90">
                              السبب: {detail.blocked_reason}
                            </p>
                          ) : null}
                          {detail.blocked_at ? (
                            <p className="mt-1 text-red-700/80 dark:text-red-200/80">
                              {new Date(detail.blocked_at).toLocaleString("ar-EG")}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-col gap-2">
                        {detail.email_blocked ? (
                          <button
                            type="button"
                            disabled={moderating}
                            onClick={() => setDialogKind("unblock")}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-800 hover:bg-red-100 disabled:opacity-60 dark:border-red-800 dark:bg-stone-900 dark:text-red-100"
                          >
                            <Ban className="h-4 w-4" aria-hidden />
                            إلغاء حظر البريد
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={moderating}
                            onClick={() => setDialogKind("block")}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400 bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            <Ban className="h-4 w-4" aria-hidden />
                            حظر البريد وحذف الحساب
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={moderating}
                          onClick={() => setDialogKind("delete")}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500 bg-red-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          حذف العميل
                        </button>
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
      <CustomerModerationDialog
        open={dialogKind !== null}
        kind={dialogKind ?? "delete"}
        customerEmail={c?.email ?? ""}
        busy={moderating}
        onClose={() => {
          if (!moderating) setDialogKind(null);
        }}
        onConfirm={(payload) => void handleModerationConfirm(payload)}
      />
    </AnimatePresence>
  );
}
