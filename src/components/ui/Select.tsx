"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Option = { label: string; value: string };

export function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 items-center gap-2 rounded-md border border-cb-border bg-cb-surface px-3 text-sm text-cb-text-strong"
        aria-expanded={open}
      >
        {active?.label}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <ul className="absolute right-0 z-20 mt-1 min-w-[170px] rounded-md border border-cb-border bg-cb-surface p-1 shadow-lg">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-cb-hover-overlay",
                  option.value === value && "text-cb-terracotta-dark",
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

