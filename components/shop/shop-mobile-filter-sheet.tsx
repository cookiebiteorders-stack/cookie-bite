"use client";

import { AnimatePresence, motion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { easeSoft } from "@/lib/motion/presets";

type Props = {
  open: boolean;
  onClose: () => void;
  activeCount: number;
  resultCount: number;
  children: ReactNode;
};

export function ShopMobileFilterSheet({
  open,
  onClose,
  activeCount,
  resultCount,
  children,
}: Props) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="shop-filter-sheet"
          className="fixed inset-0 z-50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeSoft }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-cb-scrim-strong/60"
            aria-label={t("pages.shop.closeFilters")}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-filter-sheet-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.28, ease: easeSoft }}
            className="absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,640px)] flex-col overflow-hidden rounded-t-3xl border-t border-cb-border bg-cb-surface shadow-2xl"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-center justify-between border-b border-cb-border px-5 py-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
                <h2
                  id="shop-filter-sheet-title"
                  className="font-serif text-lg font-semibold text-cb-text-strong"
                >
                  {t("pages.shop.filterAndSort")}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cb-border"
                aria-label={t("pages.shop.closeFilters")}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            <div className="border-t border-cb-border px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className={buttonClassName("primary", "w-full rounded-full py-3.5 text-base font-bold")}
              >
                {t("pages.shop.applyFilters", { count: resultCount })}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Sticky bottom bar on mobile shop */
export function ShopMobileFilterBar({
  activeCount,
  onOpen,
}: {
  activeCount: number;
  onOpen: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-cb-border bg-cb-surface/95 px-4 py-3 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={onOpen}
        className={buttonClassName(
          "outline",
          "flex w-full items-center justify-center gap-2 rounded-full py-3 font-bold",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {t("pages.shop.filterAndSort")}
        {activeCount > 0 ? (
          <span className="rounded-full bg-cb-terracotta-dark px-2 py-0.5 text-xs text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
