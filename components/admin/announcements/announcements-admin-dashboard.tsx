"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { BEHAVIOR_FLAGS } from "@/lib/announcements/behavior";
import { ANNOUNCEMENT_TYPES, TARGET_PAGES } from "@/lib/announcements/shared";
import type { AnnouncementRecord, AnnouncementType } from "@/lib/announcements/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormState = {
  type: AnnouncementType;
  title_en: string;
  title_ar: string;
  message_en: string;
  message_ar: string;
  cta_label_en: string;
  cta_label_ar: string;
  cta_url: string;
  priority: number;
  status: "active" | "scheduled" | "expired" | "draft";
  start_at: string;
  end_at: string;
  target_pages: string[];
  audience_userType: string;
  trigger_type: string;
  trigger_value: string;
  dismissible: boolean;
  audience_behaviors: string[];
  ab_test_enabled: boolean;
  ab_variant_b_title_en: string;
  ab_variant_b_message_en: string;
};

const EMPTY_FORM: FormState = {
  type: "banner",
  title_en: "",
  title_ar: "",
  message_en: "",
  message_ar: "",
  cta_label_en: "",
  cta_label_ar: "",
  cta_url: "",
  priority: 50,
  status: "draft",
  start_at: "",
  end_at: "",
  target_pages: ["all"],
  audience_userType: "all",
  trigger_type: "immediate",
  trigger_value: "",
  dismissible: true,
  audience_behaviors: [],
  ab_test_enabled: false,
  ab_variant_b_title_en: "",
  ab_variant_b_message_en: "",
};

function recordToForm(record: AnnouncementRecord): FormState {
  return {
    type: record.type,
    title_en: record.title_en,
    title_ar: record.title_ar,
    message_en: record.message_en,
    message_ar: record.message_ar,
    cta_label_en: record.cta_label_en ?? "",
    cta_label_ar: record.cta_label_ar ?? "",
    cta_url: record.cta_url ?? "",
    priority: record.priority,
    status: record.status === "expired" ? "expired" : record.status,
    start_at: record.start_at?.slice(0, 16) ?? "",
    end_at: record.end_at?.slice(0, 16) ?? "",
    target_pages: record.target_pages,
    audience_userType: record.audience.userType ?? "all",
    trigger_type: record.trigger_config.type,
    trigger_value: String(record.trigger_config.value ?? ""),
    dismissible: record.dismissible,
    audience_behaviors: record.audience.behavior ?? [],
    ab_test_enabled: Boolean(record.ab_test?.enabled),
    ab_variant_b_title_en: record.ab_test?.variants?.[1]?.title_en ?? "",
    ab_variant_b_message_en: record.ab_test?.variants?.[1]?.message_en ?? "",
  };
}

function formToPayload(form: FormState) {
  const triggerValue =
    form.trigger_type === "delay" || form.trigger_type === "scroll"
      ? Number(form.trigger_value) || 5
      : form.trigger_value || undefined;

  return {
    type: form.type,
    title_en: form.title_en,
    title_ar: form.title_ar,
    message_en: form.message_en,
    message_ar: form.message_ar,
    cta_label_en: form.cta_label_en || null,
    cta_label_ar: form.cta_label_ar || null,
    cta_url: form.cta_url || null,
    priority: form.priority,
    status: form.status,
    start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
    end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
    target_pages: form.target_pages,
    audience: {
      userType: form.audience_userType,
      behavior: form.audience_behaviors.length ? form.audience_behaviors : undefined,
    },
    trigger_config: { type: form.trigger_type, value: triggerValue },
    frequency: { perSession: true, cooldownHours: 24 },
    dismissible: form.dismissible,
    ab_test: form.ab_test_enabled
      ? {
          enabled: true,
          variants: [
            { key: "a", weight: 1 },
            {
              key: "b",
              weight: 1,
              title_en: form.ab_variant_b_title_en || undefined,
              message_en: form.ab_variant_b_message_en || undefined,
            },
          ],
        }
      : null,
  };
}

export function AnnouncementsAdminDashboard() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/announcements")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { announcements: AnnouncementRecord[] }) => setItems(data.announcements))
      .catch(() => setError(t("announcementsAdmin.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    return items.reduce(
      (acc, item) => ({
        impressions: acc.impressions + item.metrics.impressions,
        clicks: acc.clicks + item.metrics.clicks,
        dismissals: acc.dismissals + item.metrics.dismissals,
      }),
      { impressions: 0, clicks: 0, dismissals: 0 },
    );
  }, [items]);

  const ctr =
    metrics.impressions > 0
      ? ((metrics.clicks / metrics.impressions) * 100).toFixed(1)
      : "0.0";

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (record: AnnouncementRecord) => {
    setEditingId(record.id);
    setForm(recordToForm(record));
    setFormOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = formToPayload(form);
    const url = editingId
      ? `/api/admin/announcements/${editingId}`
      : "/api/admin/announcements";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      setFormOpen(false);
      load();
    } catch {
      setError(t("announcementsAdmin.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t("announcementsAdmin.deleteConfirm"))) return;
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const previewTitle = lang === "ar" ? form.title_ar : form.title_en;
  const previewMessage = lang === "ar" ? form.message_ar : form.message_en;

  return (
    <div className="admin-page space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="admin-eyebrow">{t("announcementsAdmin.eyebrow")}</p>
          <h1 className="admin-page-title">{t("announcementsAdmin.title")}</h1>
          <p className="admin-page-subtitle">{t("announcementsAdmin.subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" aria-hidden />
          {t("announcementsAdmin.create")}
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="admin-stat-card">
          <BarChart3 className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
          <p className="mt-2 text-2xl font-bold">{metrics.impressions}</p>
          <p className="text-sm text-cb-text-muted">{t("announcementsAdmin.impressions")}</p>
        </div>
        <div className="admin-stat-card">
          <Megaphone className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
          <p className="mt-2 text-2xl font-bold">{ctr}%</p>
          <p className="text-sm text-cb-text-muted">{t("announcementsAdmin.ctr")}</p>
        </div>
        <div className="admin-stat-card">
          <Bell className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
          <p className="mt-2 text-2xl font-bold">{items.filter((i) => i.status === "active").length}</p>
          <p className="text-sm text-cb-text-muted">{t("announcementsAdmin.activeCount")}</p>
        </div>
      </div>

      {error ? <p className="admin-alert admin-alert--danger">{error}</p> : null}

      <div className="admin-table-wrap overflow-x-auto">
        <table className="admin-table w-full min-w-[720px]">
          <thead>
            <tr>
              <th>{t("announcementsAdmin.colType")}</th>
              <th>{t("announcementsAdmin.colTitle")}</th>
              <th>{t("announcementsAdmin.colStatus")}</th>
              <th>{t("announcementsAdmin.colPriority")}</th>
              <th>{t("announcementsAdmin.colMetrics")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-cb-text-muted">
                  {t("announcementsAdmin.loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-cb-text-muted">
                  {t("announcementsAdmin.empty")}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="capitalize">{item.type}</td>
                  <td>{lang === "ar" ? item.title_ar : item.title_en}</td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        item.status === "active" && "bg-emerald-100 text-emerald-800",
                        item.status === "draft" && "bg-slate-100 text-slate-700",
                        item.status === "scheduled" && "bg-amber-100 text-amber-800",
                      )}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{item.priority}</td>
                  <td className="text-xs text-cb-text-muted">
                    {item.metrics.impressions} / {item.metrics.clicks} / {item.metrics.dismissals}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 hover:bg-cb-hover-overlay"
                        aria-label="Edit"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                        aria-label="Delete"
                        onClick={() => void onDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            onSubmit={onSubmit}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cb-border/60 bg-cb-surface p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? t("announcementsAdmin.edit") : t("announcementsAdmin.create")}
              </h2>
              <button type="button" onClick={() => setFormOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                {t("announcementsAdmin.fieldType")}
                <select
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AnnouncementType }))}
                >
                  {ANNOUNCEMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                {t("announcementsAdmin.fieldStatus")}
                <select
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as FormState["status"],
                    }))
                  }
                >
                  {["draft", "active", "scheduled", "expired"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm md:col-span-2">
                Title (EN)
                <input
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.title_en}
                  onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm md:col-span-2">
                العنوان (AR)
                <input
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  dir="rtl"
                  value={form.title_ar}
                  onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm md:col-span-2">
                Message (EN)
                <textarea
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  rows={3}
                  value={form.message_en}
                  onChange={(e) => setForm((f) => ({ ...f, message_en: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm md:col-span-2">
                الرسالة (AR)
                <textarea
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  dir="rtl"
                  rows={3}
                  value={form.message_ar}
                  onChange={(e) => setForm((f) => ({ ...f, message_ar: e.target.value }))}
                  required
                />
              </label>
              <label className="block text-sm">
                CTA (EN)
                <input
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.cta_label_en}
                  onChange={(e) => setForm((f) => ({ ...f, cta_label_en: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                CTA (AR)
                <input
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  dir="rtl"
                  value={form.cta_label_ar}
                  onChange={(e) => setForm((f) => ({ ...f, cta_label_ar: e.target.value }))}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                CTA URL
                <input
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.cta_url}
                  onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Priority
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                />
              </label>
              <label className="block text-sm">
                {t("announcementsAdmin.fieldAudience")}
                <select
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.audience_userType}
                  onChange={(e) => setForm((f) => ({ ...f, audience_userType: e.target.value }))}
                >
                  {["all", "guest", "logged_in", "premium", "staff"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Trigger
                <select
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.trigger_type}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
                >
                  {["immediate", "delay", "scroll", "exit_intent", "event"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Trigger value
                <input
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.trigger_value}
                  onChange={(e) => setForm((f) => ({ ...f, trigger_value: e.target.value }))}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                Target pages
                <select
                  multiple
                  className="mt-1 min-h-[5rem] w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.target_pages}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setForm((f) => ({ ...f, target_pages: selected.length ? selected : ["all"] }));
                  }}
                >
                  {TARGET_PAGES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                {t("announcementsAdmin.startAt")}
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.start_at}
                  onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                {t("announcementsAdmin.endAt")}
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border border-cb-border px-3 py-2"
                  value={form.end_at}
                  onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-sm font-medium">{t("announcementsAdmin.fieldBehaviors")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BEHAVIOR_FLAGS.map((flag) => {
                    const checked = form.audience_behaviors.includes(flag);
                    return (
                      <label
                        key={flag}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                          checked
                            ? "border-cb-terracotta-dark bg-cb-peach/40"
                            : "border-cb-border",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              audience_behaviors: checked
                                ? f.audience_behaviors.filter((b) => b !== flag)
                                : [...f.audience_behaviors, flag],
                            }))
                          }
                        />
                        {flag}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-cb-border/50 bg-cb-surface-2/30 p-3 md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.ab_test_enabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ab_test_enabled: e.target.checked }))
                    }
                  />
                  {t("announcementsAdmin.abTest")}
                </label>
                {form.ab_test_enabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      className="rounded-xl border border-cb-border px-3 py-2 text-sm"
                      placeholder="Variant B title (EN)"
                      value={form.ab_variant_b_title_en}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ab_variant_b_title_en: e.target.value }))
                      }
                    />
                    <input
                      className="rounded-xl border border-cb-border px-3 py-2 text-sm"
                      placeholder="Variant B message (EN)"
                      value={form.ab_variant_b_message_en}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, ab_variant_b_message_en: e.target.value }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-cb-border/50 bg-cb-peach/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
                {t("announcementsAdmin.preview")}
              </p>
              <p className="mt-2 font-semibold">{previewTitle || "—"}</p>
              <p className="text-sm text-cb-text">{previewMessage || "—"}</p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("announcementsAdmin.saving") : "Save"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
