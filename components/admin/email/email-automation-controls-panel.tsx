"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type AutomationEventRow = {
  id: string;
  event_name: string;
  template_key: string;
  template_name: string | null;
  template_active: boolean | null;
  is_active: boolean;
  label_ar: string;
  description_ar: string;
};

type TemplateRow = {
  id: string;
  key: string;
  name: string;
  subject: string;
  is_active: boolean;
};

type AutomationData = {
  events: AutomationEventRow[];
  templates: TemplateRow[];
};

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors disabled:opacity-50",
        checked ? "text-emerald-700 hover:bg-emerald-50" : "text-neutral-500 hover:bg-neutral-100",
      )}
    >
      {checked ? (
        <ToggleRight className="h-5 w-5 text-emerald-600" aria-hidden />
      ) : (
        <ToggleLeft className="h-5 w-5" aria-hidden />
      )}
      <span>{checked ? "مفعّل" : "موقوف"}</span>
    </button>
  );
}

export function EmailAutomationControlsPanel() {
  const [data, setData] = useState<AutomationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchJson<AutomationData & { ok?: boolean }>("/api/admin/email/automation-controls");
      setData({ events: r.events ?? [], templates: r.templates ?? [] });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchBulk = async (
    mappings: Array<{ id: string; is_active: boolean }>,
    templates: Array<{ id: string; is_active: boolean }>,
  ) => {
    if (mappings.length === 0 && templates.length === 0) return;
    setBusy(true);
    try {
      await fetchJson("/api/admin/email/automation-controls", {
        method: "PATCH",
        jsonBody: { mappings, templates },
      });
      setToast("تم حفظ التغييرات");
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setBusy(false);
    }
  };

  const toggleEvent = async (row: AutomationEventRow, next: boolean) => {
    await patchBulk([{ id: row.id, is_active: next }], []);
  };

  const toggleTemplate = async (row: TemplateRow, next: boolean) => {
    await patchBulk([], [{ id: row.id, is_active: next }]);
  };

  const bulkEvents = async (active: boolean) => {
    const ids = selectedEventIds.size > 0 ? selectedEventIds : new Set(data?.events.map((e) => e.id));
    const mappings = Array.from(ids).map((id) => ({ id, is_active: active }));
    await patchBulk(mappings, []);
    setSelectedEventIds(new Set());
  };

  const bulkTemplates = async (active: boolean) => {
    const ids =
      selectedTemplateIds.size > 0 ? selectedTemplateIds : new Set(data?.templates.map((t) => t.id));
    const templates = Array.from(ids).map((id) => ({ id, is_active: active }));
    await patchBulk([], templates);
    setSelectedTemplateIds(new Set());
  };

  const syncLibrary = async () => {
    setBusy(true);
    try {
      const r = await fetchJson<{ ok: boolean; mapped?: number; sync?: { synced?: number } }>(
        "/api/admin/email/templates/sync-and-map",
        { method: "POST" },
      );
      setToast(
        r.ok
          ? `تمت المزامنة — ${r.sync?.synced ?? 0} قالب، ${r.mapped ?? 0} ربط حدث`
          : "فشلت المزامنة",
      );
      await load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشلت المزامنة");
    } finally {
      setBusy(false);
    }
  };

  const eventSendable = useCallback((row: AutomationEventRow) => {
    return row.is_active && row.template_active !== false;
  }, []);

  const groupedTemplates = useMemo(() => {
    if (!data) return [];
    const byKey = new Map<string, TemplateRow[]>();
    for (const t of data.templates) {
      const list = byKey.get(t.key) ?? [];
      list.push(t);
      byKey.set(t.key, list);
    }
    return Array.from(byKey.entries()).map(([key, rows]) => ({
      key,
      name: rows[0]?.name ?? key,
      rows,
      allActive: rows.every((r) => r.is_active),
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {toast}
          <button type="button" className="ms-3 underline" onClick={() => setToast(null)}>
            إغلاق
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">البريد التلقائي</h2>
          <p className="mt-1 text-sm text-neutral-600">
            أوقف أو فعّل رسائل النظام واحدة تلو الأخرى أو دفعة واحدة. إيقاف الحدث يمنع الإرسال حتى لو كان
            القالب مفعّلاً.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncLibrary()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} aria-hidden />
            مزامنة القوالب
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            تحديث
          </button>
        </div>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
          <h3 className="font-medium text-neutral-900">أحداث الإرسال التلقائي</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void bulkEvents(true)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              تفعيل {selectedEventIds.size > 0 ? "المحدد" : "الكل"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void bulkEvents(false)}
              className="rounded-md bg-neutral-700 px-3 py-1.5 text-xs text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              إيقاف {selectedEventIds.size > 0 ? "المحدد" : "الكل"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-start text-neutral-500">
                <th className="px-4 py-2 font-normal">
                  <input
                    type="checkbox"
                    aria-label="تحديد كل الأحداث"
                    checked={
                      (data?.events.length ?? 0) > 0 &&
                      selectedEventIds.size === (data?.events.length ?? 0)
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEventIds(new Set(data?.events.map((ev) => ev.id)));
                      } else {
                        setSelectedEventIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-2 font-normal">الحدث</th>
                <th className="px-4 py-2 font-normal">القالب</th>
                <th className="px-4 py-2 font-normal">الحالة</th>
                <th className="px-4 py-2 font-normal">إرسال</th>
              </tr>
            </thead>
            <tbody>
              {(data?.events ?? []).map((row) => (
                <tr key={row.id} className="border-b border-neutral-50 hover:bg-neutral-50/80">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEventIds.has(row.id)}
                      onChange={(e) => {
                        const next = new Set(selectedEventIds);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        setSelectedEventIds(next);
                      }}
                      aria-label={`تحديد ${row.label_ar}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{row.label_ar}</div>
                    <div className="text-xs text-neutral-500">{row.description_ar}</div>
                    <code className="mt-1 block text-xs text-neutral-400">{row.event_name}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div>{row.template_name ?? row.template_key}</div>
                    <code className="text-xs text-neutral-400">{row.template_key}</code>
                    {row.template_active === false ? (
                      <div className="mt-1 text-xs text-amber-700">القالب موقوف — لن يُرسَل</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleSwitch
                      checked={row.is_active}
                      disabled={busy}
                      label={`تبديل ${row.label_ar}`}
                      onChange={(next) => void toggleEvent(row, next)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {eventSendable(row) ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Mail className="h-4 w-4" aria-hidden />
                        نشط
                      </span>
                    ) : (
                      <span className="text-neutral-400">متوقف</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
          <div>
            <h3 className="font-medium text-neutral-900">قوالب البريد</h3>
            <p className="text-xs text-neutral-500">إيقاف القالب يمنع استخدامه في أي حدث مرتبط به.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void bulkTemplates(true)}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              تفعيل {selectedTemplateIds.size > 0 ? "المحدد" : "الكل"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void bulkTemplates(false)}
              className="rounded-md bg-neutral-700 px-3 py-1.5 text-xs text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              إيقاف {selectedTemplateIds.size > 0 ? "المحدد" : "الكل"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-start text-neutral-500">
                <th className="px-4 py-2 font-normal">
                  <input
                    type="checkbox"
                    aria-label="تحديد كل القوالب"
                    checked={
                      (data?.templates.length ?? 0) > 0 &&
                      selectedTemplateIds.size === (data?.templates.length ?? 0)
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTemplateIds(new Set(data?.templates.map((t) => t.id)));
                      } else {
                        setSelectedTemplateIds(new Set());
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-2 font-normal">المفتاح</th>
                <th className="px-4 py-2 font-normal">الاسم</th>
                <th className="px-4 py-2 font-normal">الموضوع</th>
                <th className="px-4 py-2 font-normal">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {groupedTemplates.flatMap((group) =>
                group.rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-50 hover:bg-neutral-50/80">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTemplateIds.has(row.id)}
                        onChange={(e) => {
                          const next = new Set(selectedTemplateIds);
                          if (e.target.checked) next.add(row.id);
                          else next.delete(row.id);
                          setSelectedTemplateIds(next);
                        }}
                        aria-label={`تحديد ${row.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs">{row.key}</code>
                    </td>
                    <td className="px-4 py-3">{row.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-neutral-600" title={row.subject}>
                      {row.subject}
                    </td>
                    <td className="px-4 py-3">
                      <ToggleSwitch
                        checked={row.is_active}
                        disabled={busy}
                        label={`تبديل ${row.name}`}
                        onChange={(next) => void toggleTemplate(row, next)}
                      />
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
