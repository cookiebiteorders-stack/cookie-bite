"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { useLayout } from "@/context/layout-context";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";

const COMMAND_ITEMS = [
  { label: "Go to Dashboard", href: "/" },
  { label: "Open Shop", href: "/shop" },
  { label: "Open Gift Boxes", href: "/gift-box" },
  { label: "Open Blog", href: "/blog" },
  { label: "Open Account", href: "/account" },
  { label: "Open Contact", href: "/contact" },
] as const;

export function CommandPalette() {
  const { isCommandPaletteOpen, closeCommandPalette } = useLayout();
  const [query, setQuery] = useState("");
  useLockBodyScroll(isCommandPaletteOpen);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCommandPalette();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeCommandPalette, isCommandPaletteOpen]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <AnimatePresence>
      {isCommandPaletteOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-start justify-center bg-cb-scrim-strong/70 p-4 pt-[10vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close command palette"
            onClick={closeCommandPalette}
          />
          <motion.div
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative z-[1] w-full max-w-2xl rounded-xl border border-cb-border bg-cb-surface shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-cb-border px-4 py-3">
              <Search className="h-4 w-4 text-cb-text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="w-full bg-transparent text-sm text-cb-text-strong outline-none placeholder:text-cb-text-muted"
              />
              <kbd className="rounded border border-cb-border px-2 py-0.5 text-[10px] text-cb-text-muted">
                Esc
              </kbd>
            </div>
            <ul className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
              {filtered.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeCommandPalette}
                    className="block rounded-lg px-3 py-2 text-sm text-cb-text-strong hover:bg-cb-peach/50"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-sm text-cb-text-muted">No matching commands.</li>
              ) : null}
            </ul>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

