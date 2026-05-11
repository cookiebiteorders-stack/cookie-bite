"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Command, RefreshCw, Search, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  action: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onFocusSearch: () => void;
  onRefresh: () => void;
  onOpenAdvanced: () => void;
  onExport: () => void;
};

export function OrdersCommandPalette({
  open,
  onClose,
  onFocusSearch,
  onRefresh,
  onOpenAdvanced,
  onExport,
}: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => setQ(""));
    }
  }, [open]);

  const items = useMemo<CommandItem[]>(
    () => [
      { id: "search", label: "التركيز على البحث", hint: "/", icon: Search, action: onFocusSearch },
      { id: "adv", label: "فلاتر متقدمة", icon: Command, action: onOpenAdvanced },
      { id: "export", label: "تصدير الطلبات (الصفحة الحالية)", icon: ShoppingCart, action: onExport },
      { id: "refresh", label: "تحديث مباشر", icon: RefreshCw, action: onRefresh },
    ],
    [onExport, onFocusSearch, onOpenAdvanced, onRefresh],
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => i.label.toLowerCase().includes(s));
  }, [items, q]);

  const run = useCallback(
    (fn: () => void) => {
      fn();
      onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="orders-cmdk-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-cb-border px-3 py-2">
              <Command className="h-4 w-4 text-cb-text-muted" aria-hidden />
              <input
                autoFocus
                id="orders-cmdk-title"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="أوامر لوحة الطلبات…"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
              />
              <kbd className="hidden rounded border border-cb-border bg-cb-surface px-1.5 py-0.5 text-[10px] font-mono sm:inline">
                Esc
              </kbd>
            </div>
            <ul className="max-h-72 overflow-y-auto py-2" role="listbox">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition hover:bg-amber-50/80 dark:hover:bg-amber-950/30",
                        "focus-visible:bg-amber-50/80 focus-visible:outline-none dark:focus-visible:bg-amber-950/30",
                      )}
                      onClick={() => run(item.action)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                      <span className="flex-1 font-semibold text-stone-800 dark:text-stone-100">{item.label}</span>
                      {item.hint ? (
                        <kbd className="rounded border border-cb-border bg-cb-surface px-1.5 py-0.5 text-[10px] font-mono text-cb-text-muted">
                          {item.hint}
                        </kbd>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
