"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Ban, Loader2, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModerationDialogKind = "delete" | "block" | "unblock";

type Props = {
  open: boolean;
  kind: ModerationDialogKind;
  customerEmail: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: { confirmEmail: string; reason?: string }) => void;
};

const COPY: Record<
  ModerationDialogKind,
  { title: string; description: string; confirmLabel: string; tone: "danger" | "warning" }
> = {
  delete: {
    title: "حذف العميل",
    description:
      "سيُحذف ملف العميل من النظام ويُزال حسابه من Clerk. الطلبات السابقة تبقى. البريد لن يُحظر — يمكن للعميل التسجيل مجدداً بنفس العنوان.",
    confirmLabel: "حذف نهائي",
    tone: "danger",
  },
  block: {
    title: "حظر البريد وحذف الحساب",
    description:
      "سيُحظر البريد من التسجيل مستقبلاً، ويُحذف ملف العميل من النظام، ويُزال حساب Clerk. الطلبات السابقة تبقى في السجلات.",
    confirmLabel: "حظر وحذف",
    tone: "danger",
  },
  unblock: {
    title: "إلغاء حظر البريد",
    description: "سيُزال البريد من قائمة المحظورين ويستطيع صاحبه التسجيل مجدداً.",
    confirmLabel: "إلغاء الحظر",
    tone: "warning",
  },
};

export function CustomerModerationDialog({
  open,
  kind,
  customerEmail,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = COPY[kind];
  const needsEmailConfirm = kind !== "unblock";
  const emailMatch =
    !needsEmailConfirm ||
    confirmEmail.trim().toLowerCase() === customerEmail.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;
    setConfirmEmail("");
    setReason("");
    setError(null);
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, kind, customerEmail]);

  const submit = () => {
    if (needsEmailConfirm && !emailMatch) {
      setError("اكتب بريد العميل بالكامل كما هو معروض أدناه.");
      return;
    }
    setError(null);
    onConfirm({
      confirmEmail: confirmEmail.trim(),
      reason: reason.trim() || undefined,
    });
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduceMotion ? false : { scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { scale: 0.98, opacity: 0, y: 4 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-cb-border bg-cb-surface shadow-2xl dark:bg-cb-surface-elevated"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "flex items-start justify-between gap-3 border-b px-5 py-4",
                copy.tone === "danger"
                  ? "border-red-200/80 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30"
                  : "border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30",
              )}
            >
              <div className="flex gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                    copy.tone === "danger"
                      ? "bg-red-600 text-white"
                      : "bg-amber-600 text-white",
                  )}
                >
                  {kind === "delete" ? (
                    <Trash2 className="h-5 w-5" aria-hidden />
                  ) : (
                    <Ban className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <div>
                  <h2 id={titleId} className="font-serif text-lg font-bold text-stone-900 dark:text-stone-50">
                    {copy.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
                    {copy.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-xl border border-cb-border p-2 text-cb-text-muted hover:bg-white/80 disabled:opacity-50 dark:hover:bg-stone-900"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {needsEmailConfirm ? (
                <>
                  <div className="rounded-2xl border border-cb-border bg-cb-surface-2/80 px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-cb-text-muted">
                      بريد العميل
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {customerEmail}
                    </p>
                  </div>

                  <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                    للتأكيد، اكتب البريد بالكامل
                    <input
                      ref={inputRef}
                      type="email"
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={busy}
                      value={confirmEmail}
                      onChange={(e) => {
                        setConfirmEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={customerEmail}
                      className="mt-1.5 w-full rounded-xl border border-cb-border bg-white px-3 py-2.5 text-sm dark:bg-stone-900"
                    />
                  </label>

                  {kind === "block" ? (
                    <label className="block text-xs font-semibold text-stone-800 dark:text-stone-200">
                      سبب الحظر (اختياري)
                      <input
                        type="text"
                        disabled={busy}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="مثال: احتيال، إساءة، طلب العميل"
                        className="mt-1.5 w-full rounded-xl border border-cb-border bg-white px-3 py-2.5 text-sm dark:bg-stone-900"
                      />
                    </label>
                  ) : null}
                </>
              ) : (
                <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    البريد: <span className="font-mono font-bold">{customerEmail}</span>
                  </span>
                </p>
              )}

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-cb-border px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-xl border border-cb-border bg-white px-4 py-2.5 text-sm font-bold text-stone-800 hover:bg-cb-surface-2 disabled:opacity-50 dark:bg-stone-900 dark:text-stone-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busy || (needsEmailConfirm && (!confirmEmail.trim() || !emailMatch))}
                onClick={submit}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50",
                  copy.tone === "danger"
                    ? "bg-red-700 hover:bg-red-800"
                    : "bg-amber-700 hover:bg-amber-800",
                )}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {copy.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
