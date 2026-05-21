"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { CatalogOption } from "@/lib/products/catalog-options";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  hint?: string;
  options: CatalogOption[];
  valueCsv: string;
  onChangeCsv: (csv: string) => void;
  parse: (csv: string) => string[];
  join: (values: string[]) => string;
  labelFor: (value: string) => string;
  disabled?: boolean;
};

export function CatalogMultiSelect({
  label,
  hint,
  options,
  valueCsv,
  onChangeCsv,
  parse,
  join,
  labelFor,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parse(valueCsv), [valueCsv, parse]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (value: string) => {
    const next = selectedSet.has(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChangeCsv(join(next));
  };

  const remove = (value: string) => {
    onChangeCsv(join(selected.filter((v) => v !== value)));
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold tracking-wide text-cb-text-strong">{label}</span>
      {hint ? <p className="text-[10px] text-cb-text-muted">{hint}</p> : null}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border border-cb-border/70 bg-white px-3 py-2 text-sm font-medium text-cb-text-strong shadow-sm transition dark:bg-cb-surface dark:text-cb-text-strong",
            "hover:border-cb-terracotta-dark/40 focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/20",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="truncate text-start">
            {selected.length === 0
              ? "— اختر من القائمة —"
              : `${selected.length} محدّد`}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-cb-text-muted transition", open && "rotate-180")}
            aria-hidden
          />
        </button>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-[90] cursor-default bg-transparent"
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
            />
            <ul
              role="listbox"
              aria-multiselectable="true"
              className="absolute start-0 end-0 top-[calc(100%+4px)] z-[91] max-h-48 overflow-y-auto rounded-xl border border-cb-border bg-white py-1 shadow-lg dark:bg-cb-surface-elevated dark:text-cb-text-strong"
            >
              {options.map((opt) => {
                const checked = selectedSet.has(opt.value);
                return (
                  <li key={opt.value} role="option" aria-selected={checked}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-cb-text-strong transition hover:bg-amber-50/80 dark:hover:bg-cb-surface-2",
                        checked && "bg-amber-50/60 font-semibold text-cb-terracotta-dark dark:bg-cb-surface-2",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-cb-border text-cb-terracotta-dark focus:ring-cb-terracotta-dark/30"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(opt.value)}
                      />
                      <span className="flex-1">{opt.labelAr}</span>
                      <span className="text-[10px] text-cb-text-muted">{opt.labelEn}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-cb-terracotta-dark/10 px-2 py-0.5 text-[11px] font-bold text-cb-terracotta-dark"
            >
              {labelFor(v)}
              <button
                type="button"
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-cb-terracotta-dark/15 disabled:opacity-40"
                aria-label={`إزالة ${labelFor(v)}`}
                onClick={() => remove(v)}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
