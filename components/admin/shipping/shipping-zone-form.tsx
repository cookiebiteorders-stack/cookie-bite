"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, useReducedMotion } from "motion/react";
import { Loader2, Plus, X } from "lucide-react";
import {
  defaultZoneFormValues,
  zoneFormSchema,
  type ZoneFormValues,
} from "@/lib/shipping/orchestration-schema";
import { displayFeeToEgp } from "@/lib/shipping/currency";
import { filterEgyptCities } from "@/lib/shipping/egypt-cities";
import { useShippingOrchestrationStore } from "@/stores/shipping-orchestration-store";
import { cn } from "@/lib/utils";

type ShippingZoneFormProps = {
  existingNames: string[];
};

const inputClass =
  "peer w-full rounded-xl border border-cb-border bg-cb-surface px-3 pb-2 pt-5 text-sm text-cb-text-strong outline-none transition-shadow duration-200 placeholder:text-transparent focus:border-cb-terracotta-dark focus:ring-2 focus:ring-cb-terracotta-dark/20";

const labelClass =
  "pointer-events-none absolute start-3 top-2 text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted transition-all duration-200 peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wide";

export function ShippingZoneForm({ existingNames }: ShippingZoneFormProps) {
  const reduceMotion = useReducedMotion();
  const createZone = useShippingOrchestrationStore((s) => s.createZone);
  const mutating = useShippingOrchestrationStore((s) => s.mutating);

  const [cityDraft, setCityDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const nameList = useMemo(
    () => existingNames.map((n) => n.trim().toLowerCase()),
    [existingNames],
  );

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema) as Resolver<ZoneFormValues>,
    defaultValues: defaultZoneFormValues,
    mode: "onChange",
  });

  /* eslint-disable react-hooks/incompatible-library -- react-hook-form watch is intentionally dynamic */
  const watch = form.watch();
  /* eslint-enable react-hooks/incompatible-library */
  const cities = watch.cities ?? [];

  const setCities = useCallback((next: string[]) => {
    form.setValue("cities", next, { shouldValidate: true, shouldDirty: true });
  }, [form]);

  const baseEgp = displayFeeToEgp(watch.base_fee_display ?? 0, watch.currency ?? "EGP");
  const freeEgp =
    watch.free_shipping_enabled && watch.free_shipping_threshold_display != null
      ? displayFeeToEgp(watch.free_shipping_threshold_display, watch.currency ?? "EGP")
      : null;
  const thresholdWarning =
    watch.free_shipping_enabled &&
    freeEgp != null &&
    freeEgp < baseEgp &&
    baseEgp > 0;

  const commitCity = useCallback(
    (raw: string) => {
      const parts = raw
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (!parts.length) return;
      const current = form.getValues("cities");
      const lower = new Set(current.map((c) => c.toLowerCase()));
      const next = [...current];
      for (const p of parts) {
        if (!lower.has(p.toLowerCase())) {
          next.push(p);
          lower.add(p.toLowerCase());
        }
      }
      setCities(next);
      setCityDraft("");
      setSuggestions([]);
    },
    [form, setCities],
  );

  const onNameChange = (v: string) => {
    form.setValue("name", v, { shouldValidate: true });
    const t = v.trim().toLowerCase();
    if (t && nameList.includes(t)) {
      form.setError("name", { type: "duplicate", message: "A zone with this name already exists" });
    } else {
      form.clearErrors("name");
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const t = values.name.trim().toLowerCase();
    if (nameList.includes(t)) {
      form.setError("name", { type: "duplicate", message: "Duplicate zone name" });
      return;
    }
    const base_fee_egp = displayFeeToEgp(values.base_fee_display, values.currency);
    const free_shipping_threshold_egp =
      values.free_shipping_enabled && values.free_shipping_threshold_display != null
        ? displayFeeToEgp(values.free_shipping_threshold_display, values.currency)
        : null;

    const zone = await createZone({
      name: values.name.trim(),
      cities: values.cities,
      base_fee_egp,
      free_shipping_threshold_egp,
      eta_min_days: values.eta_min_days,
      eta_max_days: values.eta_max_days,
      is_active: values.is_active,
    });
    if (zone) {
      form.reset(defaultZoneFormValues);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2200);
    }
  });

  const namePrefix = watch.name?.trim().toLowerCase() ?? "";
  const nameSuggestions = useMemo(() => {
    if (namePrefix.length < 2) return [];
    return existingNames
      .filter((n) => n.toLowerCase().includes(namePrefix) && n.toLowerCase() !== namePrefix)
      .slice(0, 5);
  }, [existingNames, namePrefix]);

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="rounded-2xl border border-cb-border bg-cb-surface-elevated/95 p-4 shadow-sm sm:p-6"
    >
      <h2 className="font-serif text-lg font-bold text-cb-text-strong">Add delivery zone</h2>
      <p className="mt-1 text-xs text-cb-text-muted sm:text-sm">
        Floating validation, chips for cities, and smart hints — all synced to your storefront rules.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-5">
        <div className="relative">
          <input
            id="zone-name"
            className={cn(inputClass, form.formState.errors.name && "border-red-400 focus:ring-red-200")}
            placeholder=" "
            {...form.register("name", {
              onChange: (e) => onNameChange(e.target.value),
            })}
            autoComplete="off"
          />
          <label htmlFor="zone-name" className={labelClass}>
            Zone name
          </label>
          {nameSuggestions.length > 0 && (
            <div
              className="absolute z-10 mt-1 max-h-36 w-full overflow-auto rounded-xl border border-cb-border bg-cb-surface text-sm shadow-lg"
              role="listbox"
            >
              {nameSuggestions.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="block w-full px-3 py-2 text-start hover:bg-cb-hover-overlay"
                  onClick={() => {
                    form.setValue("name", n, { shouldValidate: true });
                    onNameChange(n);
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
          {form.formState.errors.name && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">
            Cities
          </p>
          <div className="flex min-h-[44px] flex-wrap gap-2 rounded-xl border border-cb-border bg-cb-surface p-2">
            {cities.map((city, index) => (
              <span
                key={`${city}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-cb-border bg-cb-cream-2/80 px-2.5 py-1 text-xs font-semibold text-cb-text-strong dark:bg-cb-surface-2"
              >
                {city}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-cb-hover-overlay"
                  onClick={() => setCities(cities.filter((_, i) => i !== index))}
                  aria-label={`Remove ${city}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
              value={cityDraft}
              onChange={(e) => {
                const v = e.target.value;
                setCityDraft(v);
                setSuggestions(filterEgyptCities(v));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  commitCity(cityDraft);
                } else if (e.key === "Backspace" && !cityDraft && cities.length) {
                  setCities(cities.slice(0, -1));
                }
              }}
              onBlur={() => {
                if (cityDraft.trim()) commitCity(cityDraft);
              }}
              placeholder={cities.length ? "Add city…" : "Type city, Enter or comma"}
            />
          </div>
          {suggestions.length > 0 && cityDraft.trim() && (
            <div className="mt-1 max-h-32 overflow-auto rounded-xl border border-cb-border bg-cb-surface text-sm shadow-md">
              {suggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="block w-full px-3 py-2 text-start hover:bg-cb-hover-overlay"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    commitCity(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {form.formState.errors.cities && (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.cities.message}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative sm:col-span-1">
            <input
              id="base-fee"
              type="number"
              min={0}
              step="0.01"
              className={cn(inputClass, form.formState.errors.base_fee_display && "border-red-400")}
              placeholder=" "
              {...form.register("base_fee_display")}
            />
            <label htmlFor="base-fee" className={labelClass}>
              Base fee
            </label>
            {form.formState.errors.base_fee_display && (
              <p className="mt-1 text-xs text-red-600">{form.formState.errors.base_fee_display.message}</p>
            )}
          </div>
          <div className="relative flex items-end gap-2">
            <label className="sr-only" htmlFor="currency">
              Currency
            </label>
            <select
              id="currency"
              className="h-[46px] w-full rounded-xl border border-cb-border bg-cb-surface px-3 text-sm font-semibold text-cb-text-strong"
              {...form.register("currency")}
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
            </select>
            <p className="absolute -bottom-5 start-0 text-[10px] text-cb-text-muted">
              Stored in EGP (~{baseEgp.toFixed(2)} EGP)
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-cb-border/80 bg-cb-surface/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-cb-text-strong">
            <input type="checkbox" className="h-4 w-4 rounded" {...form.register("free_shipping_enabled")} />
            Free shipping threshold
          </label>
          {watch.free_shipping_enabled && (
            <div className="relative w-full sm:max-w-[220px]">
              <input
                id="free-th"
                type="number"
                min={0}
                step="0.01"
                className={cn(
                  inputClass,
                  form.formState.errors.free_shipping_threshold_display && "border-red-400",
                )}
                placeholder=" "
                value={watch.free_shipping_threshold_display ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  form.setValue(
                    "free_shipping_threshold_display",
                    v === "" ? null : Number(v),
                    { shouldValidate: true },
                  );
                }}
              />
              <label htmlFor="free-th" className={labelClass}>
                Cart total ({watch.currency}) for free ship
              </label>
            </div>
          )}
        </div>
        {thresholdWarning && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Threshold is below base fee — customers may rarely qualify unless you bundle promotions.
          </p>
        )}
        {form.formState.errors.free_shipping_threshold_display && (
          <p className="text-xs text-red-600">
            {form.formState.errors.free_shipping_threshold_display.message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <input
              id="eta-min"
              type="number"
              min={0}
              className={cn(inputClass, form.formState.errors.eta_min_days && "border-red-400")}
              placeholder=" "
              {...form.register("eta_min_days")}
            />
            <label htmlFor="eta-min" className={labelClass}>
              ETA min (days)
            </label>
          </div>
          <div className="relative">
            <input
              id="eta-max"
              type="number"
              min={0}
              className={cn(inputClass, form.formState.errors.eta_max_days && "border-red-400")}
              placeholder=" "
              {...form.register("eta_max_days")}
            />
            <label htmlFor="eta-max" className={labelClass}>
              ETA max (days)
            </label>
          </div>
          {form.formState.errors.eta_max_days && (
            <p className="sm:col-span-2 text-xs text-red-600">{form.formState.errors.eta_max_days.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-cb-border bg-cb-surface px-3 py-2">
          <span className="text-sm font-semibold text-cb-text-strong">Zone active</span>
          <input type="checkbox" className="h-4 w-4 rounded" {...form.register("is_active")} />
        </div>

        <motion.button
          type="submit"
          disabled={
            mutating ||
            !watch.name?.trim() ||
            watch.name.trim().length < 2 ||
            (watch.cities?.length ?? 0) === 0
          }
          whileHover={reduceMotion ? undefined : { scale: 1.01 }}
          whileTap={reduceMotion ? undefined : { scale: 0.99 }}
          className={cn(
            "relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-bold text-white shadow-md transition-colors",
            "bg-gradient-to-r from-cb-terracotta-dark via-amber-800 to-cb-terracotta-dark",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {mutating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : submitSuccess ? (
            <>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-flex items-center gap-1"
              >
                ✓ Zone saved
              </motion.span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" aria-hidden />
              Add zone
            </>
          )}
        </motion.button>
      </form>
    </motion.section>
  );
}
