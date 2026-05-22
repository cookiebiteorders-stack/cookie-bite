"use client";

import { AlertTriangle, X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  errors: string[];
  onClose: () => void;
};

export function ImportExportErrorModal({ open, title = "أخطاء الاستيراد", errors, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div
        role="alertdialog"
        aria-labelledby="ie-error-title"
        className="relative z-10 max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-cb-border px-4 py-3">
          <h3 id="ie-error-title" className="flex items-center gap-2 text-sm font-bold text-red-800">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {title}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-cb-surface">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <ul className="max-h-64 overflow-auto px-4 py-3 text-xs leading-relaxed text-cb-text-muted">
          {errors.map((e, i) => (
            <li key={i} className="border-b border-cb-border/50 py-1.5 last:border-0">
              {e}
            </li>
          ))}
        </ul>
        <div className="border-t border-cb-border px-4 py-3 text-end">
          <button
            type="button"
            onClick={onClose}
            className="admin-btn-primary rounded-lg px-4 py-2 text-xs font-bold"
          >
            حسناً
          </button>
        </div>
      </div>
    </div>
  );
}
