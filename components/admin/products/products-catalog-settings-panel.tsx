"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, Save, Shield } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import type { ProductCatalogSettings } from "@/lib/admin/product-catalog-automation";
import { cn } from "@/lib/utils";

type Props = {
  canWrite: boolean;
  onSaved?: () => void;
};

export function ProductsCatalogSettingsPanel({ canWrite, onSaved }: Props) {
  const [settings, setSettings] = useState<ProductCatalogSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const [automationResult, setAutomationResult] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void fetchJson<{ settings: ProductCatalogSettings }>("/api/admin/products/catalog-settings", {
      cache: "no-store",
    })
      .then((res) => setSettings(res.settings))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings || !canWrite) return;
    setSaving(true);
    try {
      const res = await fetchJson<{ settings: ProductCatalogSettings }>(
        "/api/admin/products/catalog-settings",
        {
          method: "PATCH",
          jsonBody: {
            low_stock_threshold: settings.low_stock_threshold,
            auto_deactivate_zero_stock: settings.auto_deactivate_zero_stock,
            email_alerts_enabled: settings.email_alerts_enabled,
            alert_recipient_email: settings.alert_recipient_email,
            alert_cooldown_hours: settings.alert_cooldown_hours,
          },
        },
      );
      setSettings(res.settings);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const runAutomation = async () => {
    if (!canWrite) return;
    setRunningAutomation(true);
    setAutomationResult(null);
    try {
      const res = await fetchJson<{
        published: number;
        discounts_cleared: number;
        deactivated_zero_stock: number;
        low_stock_count: number;
        alert_sent: boolean;
      }>("/api/admin/products/run-automation", { method: "POST" });
      setAutomationResult(
        `نُشر ${res.published} · خصومات ${res.discounts_cleared} · إيقاف ${res.deactivated_zero_stock} · مخزون منخفض ${res.low_stock_count}`,
      );
    } catch {
      setAutomationResult("فشل تشغيل الأتمتة");
    } finally {
      setRunningAutomation(false);
    }
  };

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-xs text-cb-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> تحميل قواعد الكتالوج…
      </p>
    );
  }

  if (!settings) return null;

  return (
    <section className="rounded-2xl border border-cb-border/80 bg-cb-surface-elevated/90 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
        <Shield className="h-4 w-4 text-amber-700" aria-hidden />
        قواعد المخزون والتنبيهات
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-semibold">
          عتبة مخزون منخفض
          <input
            type="number"
            min={0}
            disabled={!canWrite}
            value={settings.low_stock_threshold}
            onChange={(e) =>
              setSettings((s) =>
                s ? { ...s, low_stock_threshold: Number(e.target.value) || 0 } : s,
              )
            }
            className="w-full rounded-lg border border-cb-border px-2 py-1.5"
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          بريد التنبيه
          <input
            type="email"
            disabled={!canWrite}
            value={settings.alert_recipient_email ?? ""}
            onChange={(e) =>
              setSettings((s) => (s ? { ...s, alert_recipient_email: e.target.value || null } : s))
            }
            className="w-full rounded-lg border border-cb-border px-2 py-1.5"
            placeholder="admin@..."
          />
        </label>
        <label className="space-y-1 text-xs font-semibold">
          فترة بين التنبيهات (ساعة)
          <input
            type="number"
            min={1}
            max={168}
            disabled={!canWrite}
            value={settings.alert_cooldown_hours}
            onChange={(e) =>
              setSettings((s) =>
                s ? { ...s, alert_cooldown_hours: Number(e.target.value) || 24 } : s,
              )
            }
            className="w-full rounded-lg border border-cb-border px-2 py-1.5"
          />
        </label>
        <div className="flex flex-col justify-end gap-2 text-xs font-semibold">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              disabled={!canWrite}
              checked={settings.auto_deactivate_zero_stock}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, auto_deactivate_zero_stock: e.target.checked } : s))
              }
            />
            إيقاف تلقائي عند نفاد المخزون
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              disabled={!canWrite}
              checked={settings.email_alerts_enabled}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, email_alerts_enabled: e.target.checked } : s))
              }
            />
            تنبيهات بريد للمخزون المنخفض
          </label>
        </div>
      </div>
      <button
        type="button"
        disabled={!canWrite || saving}
        onClick={() => void save()}
        className={cn(
          "mt-3 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900",
        )}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        حفظ القواعد
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cb-border/60 pt-3">
        <button
          type="button"
          disabled={!canWrite || runningAutomation}
          onClick={() => void runAutomation()}
          className="inline-flex items-center gap-2 rounded-xl border border-cb-border px-3 py-2 text-xs font-bold disabled:opacity-50"
        >
          {runningAutomation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          تشغيل الأتمتة الآن
        </button>
        <p className="text-[10px] text-cb-text-muted">
          يُشغَّل تلقائياً كل 15 دقيقة عبر cron/background workers — لا حاجة لفتح اللوحة.
        </p>
        {automationResult ? (
          <p className="w-full text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
            {automationResult}
          </p>
        ) : null}
      </div>
    </section>
  );
}
