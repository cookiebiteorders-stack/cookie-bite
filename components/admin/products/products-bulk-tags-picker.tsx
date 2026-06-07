"use client";

import { useEffect, useState } from "react";
import { Loader2, Tags } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type TagRow = {
  id: string;
  name_en: string;
  name_ar: string | null;
};

type Props = {
  disabled?: boolean;
  selectedCount: number;
  onApply: (params: { tagIds: string[]; mode: "add" | "remove" | "replace" }) => void;
};

export function ProductsBulkTagsPicker({ disabled, selectedCount, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"add" | "remove" | "replace">("add");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void fetchJson<{ tags: TagRow[] }>("/api/admin/products/taxonomy", { cache: "no-store" })
      .then((res) => setTags(res.tags ?? []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apply = () => {
    const tagIds = [...picked];
    if (tagIds.length === 0) return;
    onApply({ tagIds, mode });
    setOpen(false);
    setPicked(new Set());
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || selectedCount === 0}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50 dark:bg-stone-900"
      >
        <Tags className="me-1 inline h-3.5 w-3.5" />
        Tags
      </button>
      {open ? (
        <div className="absolute start-0 top-full z-40 mt-1 w-72 rounded-xl border border-cb-border bg-cb-surface-elevated p-3 shadow-xl">
          <p className="text-[10px] font-bold text-cb-text-muted">
            {selectedCount} منتج · اختر الوسوم
          </p>
          <div className="mt-2 flex gap-1">
            {(["add", "remove", "replace"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-bold",
                  mode === m ? "bg-amber-100 text-amber-900" : "text-cb-text-muted",
                )}
              >
                {m === "add" ? "إضافة" : m === "remove" ? "إزالة" : "استبدال"}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="mt-2 text-xs text-cb-text-muted">
              <Loader2 className="inline h-3 w-3 animate-spin" />
            </p>
          ) : tags.length === 0 ? (
            <p className="mt-2 text-xs text-cb-text-muted">أنشئ وسوماً من لوحة التصنيفات أولاً.</p>
          ) : (
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {tags.map((t) => (
                <li key={t.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/30">
                    <input
                      type="checkbox"
                      checked={picked.has(t.id)}
                      onChange={() => toggle(t.id)}
                    />
                    {t.name_ar ?? t.name_en}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold text-cb-text-muted"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={picked.size === 0}
              onClick={apply}
              className="rounded-lg bg-stone-900 px-3 py-1 text-[10px] font-bold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900"
            >
              تطبيق
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
