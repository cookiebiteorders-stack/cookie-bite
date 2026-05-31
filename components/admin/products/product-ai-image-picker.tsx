"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Search, Sparkles, X } from "lucide-react";
import type { ProductImageCandidate } from "@/lib/admin/product-ai-assist";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  busy: boolean;
  candidates: ProductImageCandidate[];
  onClose: () => void;
  onConfirm: (selected: ProductImageCandidate[]) => void;
};

function sourceLabel(source: ProductImageCandidate["source"]): string {
  if (source === "generated") return "توليد AI";
  if (source === "unsplash") return "Unsplash";
  if (source === "stock") return "مكتبة الكوكيز";
  return "رابط خارجي";
}

export function ProductAiImagePicker({ open, busy, candidates, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(candidates.map((c) => c.url)));
  }, [open, candidates]);

  if (!open) return null;

  const toggle = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const picked = candidates.filter((c) => selected.has(c.url));

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-image-picker-title"
      onClick={onClose}
    >
      <MotionlessPanel onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="ai-image-picker-title" className="text-base font-bold text-cb-text-strong">
              اختر صور المنتج
            </h3>
            <p className="mt-0.5 text-xs text-cb-text-muted">
              توليد بالذكاء الاصطناعي + بحث Unsplash — اختر ما يناسبك
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-cb-text-muted hover:bg-cb-peach"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {busy ? (
          <BusyState />
        ) : candidates.length === 0 ? (
          <p className="py-10 text-center text-sm text-cb-text-muted">
            لم تُرجَع أي صور — جرّب مرة أخرى.
          </p>
        ) : (
          <>
            <CandidateGrid candidates={candidates} selected={selected} onToggle={toggle} />
            <p className="mt-3 text-center text-[11px] font-medium text-cb-text-muted">
              {picked.length} من {candidates.length} محددة
            </p>
          </>
        )}

        <Footer busy={busy} disabled={picked.length === 0} onClose={onClose} onConfirm={() => onConfirm(picked)} />
      </MotionlessPanel>
    </div>
  );
}

function MotionlessPanel({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cb-border/80 bg-white p-4 shadow-2xl"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function BusyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-cb-terracotta-dark">
      <Loader2 className="h-9 w-9 animate-spin" aria-hidden />
      <p className="text-sm font-semibold">جاري التوليد والبحث…</p>
      <p className="text-xs text-cb-text-muted">قد يستغرق التوليد 10–30 ثانية</p>
    </div>
  );
}

function CandidateGrid({
  candidates,
  selected,
  onToggle,
}: {
  candidates: ProductImageCandidate[];
  selected: Set<string>;
  onToggle: (url: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {candidates.map((item) => (
        <CandidateTile
          key={item.url}
          item={item}
          isSelected={selected.has(item.url)}
          onToggle={() => onToggle(item.url)}
        />
      ))}
    </div>
  );
}

function CandidateTile({
  item,
  isSelected,
  onToggle,
}: {
  item: ProductImageCandidate;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 text-start transition",
        isSelected
          ? "border-violet-600 ring-2 ring-violet-200"
          : "border-cb-border/80 opacity-75 hover:opacity-100",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt="" className="aspect-square w-full object-cover" />
      <span
        className={cn(
          "absolute start-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white",
          item.source === "generated" ? "bg-violet-600" : "bg-emerald-600",
        )}
      >
        {item.source === "generated" ? (
          <Sparkles className="h-3 w-3" aria-hidden />
        ) : (
          <Search className="h-3 w-3" aria-hidden />
        )}
        {sourceLabel(item.source)}
      </span>
      {isSelected ? (
        <span className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow">
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

function Footer({
  busy,
  disabled,
  onClose,
  onConfirm,
}: {
  busy: boolean;
  disabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-cb-border/60 pt-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-full px-4 py-2 text-sm font-semibold text-cb-text-muted hover:bg-cb-peach"
      >
        إلغاء
      </button>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={onConfirm}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-violet-600 to-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-50"
      >
        <Check className="h-4 w-4" aria-hidden />
        إضافة المحددة
      </button>
    </div>
  );
}
