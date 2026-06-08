"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { buttonClassName } from "@/components/ui/button";
import { useAdminT } from "@/lib/admin/use-admin-t";
import type { StoreBusinessSettings } from "@/lib/store/business-settings-shared";

type Props = {
  canWrite: boolean;
  onSaved?: () => void;
};

export function StoreBusinessHoursPanel({ canWrite, onSaved }: Props) {
  const { adminT } = useAdminT();
  const [settings, setSettings] = useState<StoreBusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchJson<{ settings: StoreBusinessSettings }>(
      "/api/admin/settings/business-hours",
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
      const res = await fetchJson<{ settings: StoreBusinessSettings }>(
        "/api/admin/settings/business-hours",
        {
          method: "PATCH",
          jsonBody: {
            hours_en: settings.hours_en,
            hours_ar: settings.hours_ar,
          },
        },
      );
      setSettings(res.settings);
      setStatus(adminT("settings.storeHours.saved"));
      onSaved?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : adminT("settings.storeHours.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-6 text-sm text-stone-700">
        {adminT("settings.storeHours.loading")}
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="admin-alert admin-alert--warning rounded-3xl border p-6 text-sm">
        {adminT("settings.storeHours.loadFailed")}
      </div>
    );
  }

  return (
    <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm sm:p-6">
      <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
        <Clock3 className="h-5 w-5 text-amber-700" aria-hidden />
        {adminT("settings.storeHours.title")}
      </h2>
      <p className="mt-1 text-sm text-stone-700">{adminT("settings.storeHours.subtitle")}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-600">
            {adminT("settings.storeHours.hoursEn")}
          </span>
          <input
            type="text"
            value={settings.hours_en}
            onChange={(e) => setSettings({ ...settings, hours_en: e.target.value })}
            disabled={!canWrite}
            placeholder="Sun–Thu · 10am – 8pm"
            className="cb-field w-full dark:bg-stone-900"
            dir="ltr"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-600">
            {adminT("settings.storeHours.hoursAr")}
          </span>
          <input
            type="text"
            value={settings.hours_ar}
            onChange={(e) => setSettings({ ...settings, hours_ar: e.target.value })}
            disabled={!canWrite}
            placeholder="الأحد–الخميس · 10ص – 8م"
            className="cb-field w-full dark:bg-stone-900"
            dir="rtl"
          />
        </label>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-stone-600">
        {adminT("settings.storeHours.usageNote")}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!canWrite || saving}
          className={buttonClassName("primary", "rounded-xl px-5 py-2.5 text-sm font-bold")}
        >
          {saving ? adminT("settings.storeHours.saving") : adminT("settings.storeHours.save")}
        </button>
        {!canWrite ? (
          <p className="text-xs text-stone-600">{adminT("settings.storeHours.readOnly")}</p>
        ) : null}
        {status ? <p className="text-sm font-semibold text-stone-800">{status}</p> : null}
      </div>
    </section>
  );
}
