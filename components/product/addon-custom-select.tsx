"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AddonSelectOption = {
  id: string;
  label: string;
  sublabel?: string;
  priceLabel?: string;
  disabled?: boolean;
  badge?: string;
};

type Props = {
  value: string;
  placeholder: string;
  options: AddonSelectOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  className?: string;
};

export function AddonCustomSelect({
  value,
  placeholder,
  options,
  onChange,
  compact,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = options.find((o) => o.id === value);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border border-cb-border/80 bg-gradient-to-b from-cb-cream to-cb-surface/95 px-3.5 text-start font-medium text-cb-text-strong shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition",
          "hover:border-cb-terracotta-dark/35 focus:border-cb-terracotta-dark focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/20",
          open && "border-cb-terracotta-dark/45 ring-2 ring-cb-terracotta-dark/15",
          compact ? "py-2 text-xs" : "py-2.5 text-sm",
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {active ? (
            <span className="flex flex-col gap-0.5">
              <span>{active.label}</span>
              {active.sublabel ? (
                <span className="text-[10px] font-normal text-cb-text-muted">{active.sublabel}</span>
              ) : null}
            </span>
          ) : (
            <span className="text-cb-text-muted">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-cb-terracotta-dark transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute inset-x-0 z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-cb-border/80 bg-cb-surface p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)]",
            "animate-in fade-in slide-in-from-top-1 duration-150",
          )}
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-cb-text-muted">{placeholder}</li>
          ) : (
            options.map((opt) => {
              const selected = opt.id === value;
              return (
                <li key={opt.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => {
                      if (opt.disabled) return;
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start transition",
                      selected
                        ? "bg-cb-peach/50 text-cb-text-strong"
                        : "hover:bg-cb-hover-overlay",
                      opt.disabled && "cursor-not-allowed opacity-45",
                      compact ? "text-xs" : "text-sm",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge ? (
                          <span className="shrink-0 rounded-full bg-cb-border/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cb-text-muted">
                            {opt.badge}
                          </span>
                        ) : null}
                      </span>
                      {opt.sublabel ? (
                        <span className="mt-0.5 block text-[11px] text-cb-text-muted">
                          {opt.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {opt.priceLabel ? (
                      <span className="shrink-0 text-xs font-bold text-cb-terracotta-dark">
                        {opt.priceLabel}
                      </span>
                    ) : null}
                    {selected ? (
                      <Check className="size-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
