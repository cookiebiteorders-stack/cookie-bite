"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  count: number;
  saving?: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function ProductsFloatingSaveBar({ count, saving, onSave, onDiscard }: Props) {
  if (count <= 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-amber-300/80 bg-amber-50/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-md dark:border-amber-800 dark:bg-amber-950/90"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-amber-950 dark:text-amber-50">
          {count} منتج به تعديلات غير محفوظة — Ctrl+S للحفظ
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onDiscard}
            className={cn(buttonClassName("outline"), "inline-flex gap-2 px-4 py-2 text-xs disabled:opacity-50")}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            تجاهل
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={cn(
              buttonClassName("primary"),
              "inline-flex gap-2 px-5 py-2 text-xs disabled:opacity-50",
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التعديلات
          </button>
        </div>
      </div>
    </div>
  );
}
