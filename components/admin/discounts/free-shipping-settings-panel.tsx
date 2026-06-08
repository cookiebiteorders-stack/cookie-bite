"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { buttonClassName } from "@/components/ui/button";
import { useAdminT } from "@/lib/admin/use-admin-t";
import type { StoreCommerceSettings } from "@/lib/store/commerce-settings-shared";

type Props = {
  canWrite: boolean;
};

export function FreeShippingSettingsPanel({ canWrite }: Props) {
  const { adminT } = useAdminT();
  const [settings, setSettings] = useState<StoreCommerceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchJson<{ settings: StoreCommerceSettings }>(
      "/api/admin/discounts/commerce-settings",
      { cache: "no-store" },
    )
      .then((res) => setSettings(res.settings))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings || !canWrite) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetchJson<{ settings: StoreCommerceSettings }>(
        "/api/admin/discounts/commerce-settings",
        {
          method: "PATCH",
          jsonBody: {
            free_shipping_threshold_egp: settings.free_shipping_threshold_egp,
          },
        },
      );
      setSettings(res.settings);
      setStatus(adminT("discounts.freeShipping.saved"));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : adminT("discounts.freeShipping.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-6 text-sm text-stone-700">
        {adminT("discounts.freeShipping.loading")}
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="admin-alert admin-alert--warning rounded-3xl border p-6 text-sm">
        {adminT("discounts.freeShipping.loadFailed")}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
      <h2 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
        <Truck className="h-5 w-5 text-amber-700" aria-hidden />
        {adminT("discounts.freeShipping.title")}
      </h2>
      <p className="mt-1 text-sm text-stone-700">{adminT("discounts.freeShipping.subtitle")}</p>

      <div className="mt-5 max-w-sm">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-600">
            {adminT("discounts.freeShipping.thresholdLabel")}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              value={settings.free_shipping_threshold_egp}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  free_shipping_threshold_egp: Math.max(0, Number(e.target.value) || 0),
                })
              }
              disabled={!canWrite}
              className="cb-field w-full dark:bg-stone-900"
              dir="ltr"
            />
            <span className="shrink-0 text-sm font-bold text-stone-600">EGP</span>
          </div>
        </label>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-600">
        {adminT("discounts.freeShipping.usageNote")}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canWrite || saving}
          className={buttonClassName("primary", "rounded-xl px-5 py-2.5 text-sm font-bold")}
        >
          {saving ? adminT("discounts.freeShipping.saving") : adminT("discounts.freeShipping.save")}
        </button>
        {!canWrite ? (
          <p className="text-xs text-stone-600">{adminT("discounts.freeShipping.readOnly")}</p>
        ) : null}
        {status ? <p className="text-sm font-semibold text-stone-800">{status}</p> : null}
      </div>
    </section>
  );
}
