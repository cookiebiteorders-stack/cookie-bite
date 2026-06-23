"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Minus, Plus, Sparkles } from "lucide-react";
import { AddonCustomSelect } from "@/components/product/addon-custom-select";
import { dedupeAddonsByName } from "@/lib/addons/dedupe";
import {
  addonGroupHasSelection,
  addonSelectionKey,
  buildCartAddonsFromSelection,
  buildInitialAddonSelection,
  clearAddonSelection,
  computeAddonsTotalEgp,
  getAddonOptionMaxQty,
  getSelectedOptionIdForAddon,
  isAddonOptionInStock,
  setAddonOptionQty,
  setSingleAddonChoice,
  toggleMultiAddonOption,
  type AddonSelectedMap,
} from "@/lib/addons/selection";
import type { Addon, AddonOption } from "@/lib/addons/types";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  linkedAddons: Addon[];
  variant?: "compact" | "full";
  selected: AddonSelectedMap;
  onSelectedChange: (next: AddonSelectedMap) => void;
  className?: string;
};

function formatWeight(grams: number | null | undefined, locale: string): string | null {
  if (grams == null || grams <= 0) return null;
  return locale === "ar" ? `${grams} جم` : `${grams} g`;
}

function optionMetaLine(
  opt: AddonOption,
  lang: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string | undefined {
  const parts: string[] = [];
  const weight = formatWeight(opt.weight_grams, lang);
  if (weight) parts.push(weight);
  if (opt.stock != null) {
    if (opt.stock <= 0) parts.push(t("product.addonsOutOfStock"));
    else if (opt.stock <= 5) parts.push(t("product.addonsLowStock", { count: opt.stock }));
  }
  return parts.length ? parts.join(" · ") : undefined;
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
  const { t, formatPrice, lang } = useLanguage();
  const chosenId = getSelectedOptionIdForAddon(selected, addon.id);
  const chosen = addon.options.find((o) => o.id === chosenId);

  const selectOptions = addon.options.map((opt) => {
    const inStock = isAddonOptionInStock(opt);
    const price = Number(opt.price);
    return {
      id: opt.id,
      label: opt.name,
      sublabel: optionMetaLine(opt, lang, t),
      priceLabel: price > 0 ? `+${formatPrice(price)}` : undefined,
      disabled: !inStock,
      badge: !inStock ? t("product.addonsOutOfStock") : undefined,
    };
  });

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <div className="flex items-baseline justify-between gap-2">
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
        {addon.description?.trim() ? (
          <span className="text-[10px] text-cb-text-muted">{addon.description}</span>
        ) : null}
      </div>
      <AddonCustomSelect
        value={chosenId}
        placeholder={t("product.addonsChoose")}
        options={selectOptions}
        compact={compact}
        onChange={(id) => onSelectedChange(setSingleAddonChoice(selected, addon.id, id))}
      />
      {chosen ? (
        <SelectedAddonChip
          label={chosen.name}
          price={Number(chosen.price) > 0 ? formatPrice(Number(chosen.price)) : undefined}
          meta={optionMetaLine(chosen, lang, t)}
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
  price,
  meta,
  onClear,
  compact,
}: {
  label: string;
  price?: string;
  meta?: string;
  onClear?: () => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border border-cb-terracotta-dark/25 bg-gradient-to-r from-cb-peach/40 to-cb-cream/60 px-3 py-2",
        compact && "px-2 py-1.5 text-[11px]",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-cb-text-strong">
          <span className="text-cb-terracotta-dark">{t("product.addonsSelected")}: </span>
          {label}
          {price ? <span className="ms-1 text-cb-terracotta-dark">({price})</span> : null}
        </span>
        {meta ? <span className="text-[10px] text-cb-text-muted">{meta}</span> : null}
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
  const { t, formatPrice, lang } = useLanguage();
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
          "flex w-full items-center justify-between gap-2 rounded-xl border border-cb-border/80 bg-gradient-to-b from-cb-cream to-cb-surface/95 px-3 py-2.5 text-start text-sm font-medium shadow-sm transition hover:border-cb-terracotta-dark/40",
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
            "space-y-2 rounded-xl border border-cb-border/60 bg-cb-surface/95 p-2.5 shadow-inner",
            compact && "p-2 text-[11px]",
          )}
        >
          {addon.options.map((opt) => {
            const inStock = isAddonOptionInStock(opt);
            const checked = (map[opt.id] ?? 0) > 0;
            const currentQty = map[opt.id] ?? 0;
            const maxQty = getAddonOptionMaxQty(opt);
            const price = Number(opt.price);
            const meta = optionMetaLine(opt, lang, t);
            return (
              <div
                key={opt.id}
                className={cn(
                  "rounded-xl border px-3 py-2.5 transition",
                  checked
                    ? "border-cb-terracotta-dark/35 bg-cb-peach/25"
                    : "border-cb-border/50 bg-cb-cream/40",
                  !inStock && "opacity-50",
                )}
              >
                <label
                  className={cn(
                    "flex cursor-pointer items-start justify-between gap-3",
                    !inStock && "cursor-not-allowed",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-cb-text-strong">
                      {opt.name}
                      {price > 0 ? (
                        <span className="text-xs font-bold text-cb-terracotta-dark">
                          +{formatPrice(price)}
                        </span>
                      ) : null}
                    </span>
                    {meta ? (
                      <span className="mt-0.5 block text-[11px] text-cb-text-muted">{meta}</span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                      checked
                        ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
                        : "border-cb-border bg-cb-surface",
                    )}
                  >
                    {checked ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    disabled={!inStock}
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
                {checked && maxQty > 1 ? (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center rounded-lg border border-cb-border bg-cb-surface text-cb-text-strong"
                      onClick={() =>
                        onSelectedChange(
                          setAddonOptionQty(
                            selected,
                            addon.id,
                            opt.id,
                            currentQty - 1,
                            opt.quantity_limit,
                            opt.stock,
                          ),
                        )
                      }
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="min-w-6 text-center text-xs font-bold">{currentQty}</span>
                    <button
                      type="button"
                      className="flex size-7 items-center justify-center rounded-lg border border-cb-border bg-cb-surface text-cb-text-strong disabled:opacity-40"
                      disabled={currentQty >= maxQty}
                      onClick={() =>
                        onSelectedChange(
                          setAddonOptionQty(
                            selected,
                            addon.id,
                            opt.id,
                            currentQty + 1,
                            opt.quantity_limit,
                            opt.stock,
                          ),
                        )
                      }
                    >
                      <Plus className="size-3.5" />
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

export function useAddonSelectionState(
  linkedAddons: Addon[],
  opts?: { emptyOptional?: boolean },
) {
  const addons = useMemo(() => dedupeAddonsByName(linkedAddons), [linkedAddons]);
  const addonKey = useMemo(() => addonSelectionKey(addons), [addons]);
  const emptyOptional = opts?.emptyOptional ?? false;
  const [selected, setSelected] = useState<AddonSelectedMap>(() =>
    buildInitialAddonSelection(addons, { emptyOptional }),
  );

  useEffect(() => {
    setSelected(buildInitialAddonSelection(addons, { emptyOptional }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addonKey يعكس المحتوى
  }, [addonKey, emptyOptional]);

  const selectedAddons = useMemo(
    () => buildCartAddonsFromSelection(addons, selected),
    [addons, selected],
  );
  const addonsTotal = computeAddonsTotalEgp(selectedAddons);

  return { addons, selected, setSelected, selectedAddons, addonsTotal };
}
