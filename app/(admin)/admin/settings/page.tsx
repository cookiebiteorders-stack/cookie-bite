"use client";

import { useEffect, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { fetchJson } from "@/lib/http/fetch-json";

type HealthResponse = {
  canonical_host: string;
  node_env: string;
  env: {
    ok: boolean;
    missing: string[];
    warnings: string[];
  };
};

type Template = {
  id: string;
  channel: "email" | "sms" | "whatsapp" | "push";
  key: string;
  language: "en" | "ar";
  subject: string | null;
  body: string;
  is_active: boolean;
};

type TemplatesResponse = {
  templates: Template[];
  warning?: { en: string; ar: string };
};

export default function AdminSettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  /** فشل تحميل فحص البيئة (نادر) */
  const [error, setError] = useState<string | null>(null);
  /** فشل تحميل قوالب الإشعارات — لا يمنع عرض بقية الإعدادات */
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [migrationWarning, setMigrationWarning] = useState<{
    en: string;
    ar: string;
  } | null>(null);

  const [tplChannel, setTplChannel] = useState<"email" | "sms" | "whatsapp" | "push">("email");
  const [tplKey, setTplKey] = useState("order_confirmed");
  const [tplLanguage, setTplLanguage] = useState<"en" | "ar">("en");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    setTemplatesError(null);
    setMigrationWarning(null);

    const healthP = fetchJson<HealthResponse>("/api/admin/settings/health", {
      cache: "no-store",
      timeoutMs: 15_000,
      retries: 1,
      retryDelayMs: 250,
    })
      .then((data) => ({ ok: true as const, data }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const templatesP = fetchJson<TemplatesResponse>(
      "/api/admin/notifications/templates",
      {
        cache: "no-store",
        timeoutMs: 15_000,
        retries: 1,
        retryDelayMs: 250,
      },
    )
      .then((data) => ({ ok: true as const, data }))
      .catch((err: unknown) => ({ ok: false as const, err }));

    const [hRes, tRes] = await Promise.all([healthP, templatesP]);

    if (hRes.ok) {
      setHealth(hRes.data);
    } else {
      setHealth(null);
      setError(
        hRes.err instanceof Error ? hRes.err.message : "Failed to load health",
      );
    }

    if (tRes.ok) {
      setTemplates(tRes.data.templates ?? []);
      setMigrationWarning(tRes.data.warning ?? null);
    } else {
      setTemplates([]);
      setTemplatesError(
        tRes.err instanceof Error
          ? tRes.err.message
          : "Failed to load notification templates",
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void load();
    });
    return cancel;
  }, []);

  async function upsertTemplate() {
    setError(null);
    try {
      await fetchJson<{ ok: boolean }>("/api/admin/notifications/templates", {
        method: "POST",
        timeoutMs: 15_000,
        retries: 1,
        retryDelayMs: 250,
        jsonBody: {
          channel: tplChannel,
          key: tplKey,
          language: tplLanguage,
          subject: tplSubject || undefined,
          body: tplBody,
          is_active: true,
        },
      });
    } catch (err) {
      setTemplatesError(
        err instanceof Error ? err.message : "Failed to save template",
      );
      return;
    }
    setTplBody("");
    await load();
  }

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          System Settings (Owner Only)
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          Business identity, payment gateways, shipping rules, notification providers, and integrations.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-cb-text-muted">
          Loading settings...
        </div>
      ) : (
        <>
          {migrationWarning ? (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">{migrationWarning.en}</p>
              <p className="mt-1 text-xs opacity-90" dir="rtl">
                {migrationWarning.ar}
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-red-600">
              <p className="font-semibold">Environment check failed</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold text-cb-text-strong"
              >
                Retry / إعادة المحاولة
              </button>
            </div>
          ) : null}

          {templatesError ? (
            <div className="rounded-2xl border border-amber-300/80 bg-amber-50/90 p-5 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/25 dark:text-amber-100">
              <p className="font-semibold">Notification templates</p>
              <p className="mt-1">{templatesError}</p>
              <p className="mt-2 text-xs text-cb-text-muted">
                تأكد من تشغيل هجرات Supabase (مثلاً `0005_phase_cde_foundations.sql`) وأن
                `SUPABASE_SERVICE_KEY` صحيح.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 rounded-xl border border-cb-border bg-cb-surface px-4 py-2 text-sm font-semibold text-cb-text-strong"
              >
                Retry templates / إعادة تحميل القوالب
              </button>
            </div>
          ) : null}

          {health ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
                <p className="font-semibold text-cb-text-strong">Canonical Host</p>
                <p className="mt-1 text-sm text-cb-text">{health.canonical_host}</p>
              </article>
              <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
                <p className="font-semibold text-cb-text-strong">Env Status</p>
                <p className="mt-1 text-sm text-cb-text">
                  {health.env.ok ? "Healthy" : `Missing: ${health.env.missing.join(", ")}`}
                </p>
              </article>
            </div>
          ) : null}

          <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
            <h2 className="text-lg font-bold text-cb-text-strong">Notification Templates</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <select
                value={tplChannel}
                onChange={(e) => setTplChannel(e.target.value as "email" | "sms" | "whatsapp" | "push")}
                className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              >
                <option value="email">email</option>
                <option value="sms">sms</option>
                <option value="whatsapp">whatsapp</option>
                <option value="push">push</option>
              </select>
              <input
                value={tplKey}
                onChange={(e) => setTplKey(e.target.value)}
                placeholder="template key"
                className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              />
              <select
                value={tplLanguage}
                onChange={(e) => setTplLanguage(e.target.value as "en" | "ar")}
                className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              >
                <option value="en">en</option>
                <option value="ar">ar</option>
              </select>
              <input
                value={tplSubject}
                onChange={(e) => setTplSubject(e.target.value)}
                placeholder="subject (optional)"
                className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void upsertTemplate()}
                className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
              >
                Save Template
              </button>
            </div>
            <textarea
              value={tplBody}
              onChange={(e) => setTplBody(e.target.value)}
              placeholder="template body"
              className="mt-3 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              rows={4}
            />

            <div className="mt-4 space-y-2">
              {templates.map((t) => (
                <article
                  key={t.id}
                  className="rounded-xl border border-cb-border bg-cb-surface-2 p-3 text-sm"
                >
                  <p className="font-semibold text-cb-text-strong">
                    {t.channel}:{t.key} ({t.language})
                  </p>
                  <p className="mt-1 text-xs text-cb-text-muted">{t.subject ?? "No subject"}</p>
                </article>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

