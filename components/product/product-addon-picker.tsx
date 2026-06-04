"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Sparkles } from "lucide-react";
import { dedupeAddonsByName } from "@/lib/addons/dedupe";
import {
  addonGroupHasSelection,
  buildCartAddonsFromSelection,
  buildInitialAddonSelection,
  clearAddonSelection,
  computeAddonsTotalEgp,
  getSelectedOptionIdForAddon,
  setAddonOptionQty,
  setSingleAddonChoice,
  toggleMultiAddonOption,
  type AddonSelectedMap,
} from "@/lib/addons/selection";
import type { Addon } from "@/lib/addons/types";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const selectClass =
  "w-full appearance-none rounded-xl border border-cb-border/80 bg-cb-cream/90 py-2.5 pe-10 ps-3 text-sm font-medium text-cb-text-strong shadow-sm transition focus:border-cb-terracotta-dark focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/25 dark:bg-cb-surface-2 dark:text-cb-text-strong";

type Props = {
  linkedAddons: Addon[];
  /** compact = بطاقة المتجر، full = صفحة المنتج (قوائم منسدلة) */
  variant?: "compact" | "full";
  selected: AddonSelectedMap;
  onSelectedChange: (next: AddonSelectedMap) => void;
  className?: string;
};

function optionLabel(
  name: string,
  size: string | null | undefined,
  price: number,
  formatPrice: (n: number) => string,
) {
  const bit = size?.trim() ? `${name} (${size.trim()})` : name;
  return price > 0 ? `${bit} — ${formatPrice(price)}` : bit;
}

function AddonSingleDropdown({
  addon,
  selected,
  onSelectedChange,
  compact,
}: {
  addon: Addon;
  selected: AddonSelectedMap;
  onSelectedChange: (next: AddonSelectedMap) => void;
  compact?: boolean;
}) {
  const { t, formatPrice } = useLanguage();
  const chosenId = getSelectedOptionIdForAddon(selected, addon.id);
  const chosen = addon.options.find((o) => o.id === chosenId);

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <label
        className={cn(
          "block font-semibold text-cb-text-strong",
          compact ? "text-[11px]" : "text-sm",
        )}
      >
        {addon.name}
        {addon.required ? (
          <span className="ms-1 text-cb-terracotta-dark">*</span>
        ) : null}
      </label>
      <div className="relative">
        <select
          className={cn(selectClass, compact && "py-2 text-xs")}
          value={chosenId}
          onChange={(e) =>
            onSelectedChange(setSingleAddonChoice(selected, addon.id, e.target.value))
          }
        >
          <option value="">{t("product.addonsChoose")}</option>
          {addon.options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {optionLabel(opt.name, opt.size, Number(opt.price), formatPrice)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted"
          aria-hidden
        />
      </div>
      {chosen ? (
        <SelectedAddonChip
          label={optionLabel(chosen.name, chosen.size, Number(chosen.price), formatPrice)}
          onClear={
            addon.required
              ? undefined
              : () => onSelectedChange(clearAddonSelection(selected, addon.id))
          }
          compact={compact}
        />
      ) : null}
    </div>
  );
}

function SelectedAddonChip({
  label,
  onClear,
  compact,
}: {
  label: string;
  onClear?: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-cb-terracotta-dark/25 bg-cb-peach/30 px-3 py-2",
        compact && "px-2 py-1.5 text-[11px]",
      )}
    >
      <span className="min-w-0 truncate font-semibold text-cb-text-strong">
        <span className="text-cb-terracotta-dark">{t("product.addonsSelected")}: </span>
        {label}
      </span>
      {onClear ? (
        <button
          type="button"
          className="shrink-0 text-[11px] font-bold text-cb-terracotta-dark underline-offset-2 hover:underline"
          onClick={onClear}
        >
          {t("product.addonsClear")}
        </button>
      ) : null}
    </div>
  );
}

function AddonMultiCollapsible({
  addon,
  selected,
  onSelectedChange,
  compact,
}: {
  addon: Addon;
  selected: AddonSelectedMap;
  onSelectedChange: (next: AddonSelectedMap) => void;
  compact?: boolean;
}) {
  const { t, formatPrice } = useLanguage();
  const map = selected[addon.id] ?? {};
  const hasPick = addonGroupHasSelection(selected, addon.id);
  const [open, setOpen] = useState(false);
  const showPanel = open || hasPick;

  const summary = addon.options
    .filter((o) => (map[o.id] ?? 0) > 0)
    .map((o) => `${o.name}${(map[o.id] ?? 0) > 1 ? ` ×${map[o.id]}` : ""}`)
    .join(" · ");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "font-semibold text-cb-text-strong",
            compact ? "text-[11px]" : "text-sm",
          )}
        >
          {addon.name}
          {addon.required ? (
            <span className="ms-1 text-cb-terracotta-dark">*</span>
          ) : null}
        </span>
        {hasPick && !addon.required ? (
          <button
            type="button"
            className="text-[10px] font-semibold text-cb-terracotta-dark hover:underline"
            onClick={() => {
              onSelectedChange(clearAddonSelection(selected, addon.id));
              setOpen(false);
            }}
          >
            {t("product.addonsClear")}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-cb-border/80 bg-cb-cream/90 px-3 py-2.5 text-start text-sm font-medium shadow-sm transition hover:border-cb-terracotta-dark/40 dark:bg-cb-surface-2",
          compact && "py-2 text-xs",
          showPanel && "border-cb-terracotta-dark/35 ring-1 ring-cb-terracotta-dark/15",
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={showPanel}
      >
        <span className="min-w-0 truncate text-cb-text-strong">
          {hasPick ? summary : t("product.addonsCustomize")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-cb-terracotta-dark transition",
            showPanel && "rotate-180",
          )}
        />
      </button>
      {showPanel ? (
        <div
          className={cn(
            "space-y-1.5 rounded-xl border border-cb-border/60 bg-cb-surface/90 p-2.5",
            compact && "p-2 text-[11px]",
          )}
        >
          {addon.options.map((opt) => {
            const checked = (map[opt.id] ?? 0) > 0;
            const currentQty = map[opt.id] ?? 0;
            return (
              <div
                key={opt.id}
                className="rounded-lg border border-cb-border/50 bg-cb-cream/50 px-2.5 py-2 dark:bg-cb-surface-2/80"
              >
                <label className="flex cursor-pointer items-center justify-between gap-2">
                  <span className="min-w-0 leading-snug">
                    {optionLabel(opt.name, opt.size, Number(opt.price), formatPrice)}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    className="size-4 shrink-0 accent-[var(--cb-terracotta-dark)]"
                    onChange={(e) =>
                      onSelectedChange(
                        toggleMultiAddonOption(
                          selected,
                          addon.id,
                          opt.id,
                          e.target.checked,
                        ),
                      )
                    }
                  />
                </label>
                {checked &&
                (opt.quantity_limit != null || addon.type === "multiple_choice") ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-cb-border px-2 py-0.5 text-xs"
                      onClick={() =>
                        onSelectedChange(
                          setAddonOptionQty(
                            selected,
                            addon.id,
                            opt.id,
                            currentQty - 1,
                            opt.quantity_limit,
                          ),
                        )
                      }
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center text-xs font-bold">{currentQty}</span>
                    <button
                      type="button"
                      className="rounded-lg border border-cb-border px-2 py-0.5 text-xs"
                      onClick={() =>
                        onSelectedChange(
                          setAddonOptionQty(
                            selected,
                            addon.id,
                            opt.id,
                            currentQty + 1,
                            opt.quantity_limit,
                          ),
                        )
                      }
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ProductAddonPicker({
  linkedAddons,
  variant = "full",
  selected,
  onSelectedChange,
  className,
}: Props) {
  const { t, formatPrice } = useLanguage();
  const addons = useMemo(() => dedupeAddonsByName(linkedAddons), [linkedAddons]);
  const selectedAddons = useMemo(
    () => buildCartAddonsFromSelection(addons, selected),
    [addons, selected],
  );
  const addonsTotal = computeAddonsTotalEgp(selectedAddons);

  if (addons.length === 0) return null;

  const compact = variant === "compact";
  const isPdp = variant === "full";

  return (
    <div
      className={cn(
        isPdp
          ? "overflow-hidden rounded-2xl border border-cb-border/70 bg-gradient-to-b from-cb-surface via-cb-surface to-cb-peach/15 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
          : "rounded-xl border border-cb-border/80 bg-cb-surface/90 p-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-cb-border/50",
          isPdp ? "bg-cb-peach/20 px-4 py-3" : "mb-2 pb-2",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-cb-terracotta-dark/10 text-cb-terracotta-dark",
              isPdp ? "size-9" : "size-7",
            )}
          >
            {isPdp ? (
              <Sparkles className="size-4" aria-hidden />
            ) : (
              <Plus className="size-3.5" aria-hidden />
            )}
          </span>
          <p
            className={cn(
              "font-bold text-cb-text-strong",
              isPdp ? "font-serif text-base" : "text-xs",
            )}
          >
            {t("product.addonsLabel")}
          </p>
        </div>
        {addonsTotal > 0 ? (
          <span
            className={cn(
              "rounded-full bg-cb-terracotta-dark px-2.5 py-0.5 font-bold text-white",
              compact ? "text-[10px]" : "text-xs",
            )}
          >
            +{formatPrice(addonsTotal)}
          </span>
        ) : null}
      </div>

      <div className={cn("space-y-4", isPdp ? "p-4" : "space-y-2")}>
        {addons.map((addon) =>
          addon.type === "single_choice" ? (
            <AddonSingleDropdown
              key={addon.id}
              addon={addon}
              selected={selected}
              onSelectedChange={onSelectedChange}
              compact={compact}
            />
          ) : (
            <AddonMultiCollapsible
              key={addon.id}
              addon={addon}
              selected={selected}
              onSelectedChange={onSelectedChange}
              compact={compact}
            />
          ),
        )}
      </div>

      {isPdp && addonsTotal > 0 ? (
        <div className="border-t border-cb-border/50 bg-cb-peach/10 px-4 py-2.5 text-xs font-semibold text-cb-text-strong">
          {t("product.addonsTotal", { price: formatPrice(addonsTotal) })}
        </div>
      ) : null}
    </div>
  );
}

/** يُهيّئ الاختيار — صفحة المنتج تبدأ بدون اختيار للإضافات الاختيارية */
export function useAddonSelectionState(
  linkedAddons: Addon[],
  opts?: { emptyOptional?: boolean },
) {
  const addons = useMemo(() => dedupeAddonsByName(linkedAddons), [linkedAddons]);
  const emptyOptional = opts?.emptyOptional ?? false;
  const [selected, setSelected] = useState<AddonSelectedMap>(() =>
    buildInitialAddonSelection(addons, { emptyOptional }),
  );

  useEffect(() => {
    setSelected(buildInitialAddonSelection(addons, { emptyOptional }));
  }, [addons, emptyOptional]);

  const selectedAddons = useMemo(
    () => buildCartAddonsFromSelection(addons, selected),
    [addons, selected],
  );
  const addonsTotal = computeAddonsTotalEgp(selectedAddons);

  return { addons, selected, setSelected, selectedAddons, addonsTotal };
}
