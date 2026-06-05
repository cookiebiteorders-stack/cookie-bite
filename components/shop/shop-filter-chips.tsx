"use client";

import { X } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

export type ShopFilterChip = {
  id: string;
  label: string;
  onRemove: () => void;
};

type Props = {
  chips: ShopFilterChip[];
  onClearAll: () => void;
  className?: string;
};

export function ShopFilterChips({ chips, onClearAll, className }: Props) {
  const { t } = useLanguage();
  if (chips.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center gap-2",
        className,
      )}
      aria-label={t("pages.shop.activeFiltersAria")}
    >
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full bg-cb-peach px-3 py-1.5 text-xs font-bold text-cb-text-strong ring-1 ring-cb-border transition hover:bg-cb-peach-deep/60"
        >
          <span>{chip.label}</span>
          <X className="h-3 w-3" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-bold text-cb-terracotta-dark underline-offset-2 hover:underline"
      >
        {t("pages.shop.clearAll")}
      </button>
    </div>
  );
}
