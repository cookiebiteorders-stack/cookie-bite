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

export default function AdminSettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tplChannel, setTplChannel] = useState<"email" | "sms" | "whatsapp" | "push">("email");
  const [tplKey, setTplKey] = useState("order_confirmed");
  const [tplLanguage, setTplLanguage] = useState<"en" | "ar">("en");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [healthData, templatesData] = await Promise.all([
        fetchJson<HealthResponse>("/api/admin/settings/health", {
          cache: "no-store",
          timeoutMs: 15_000,
          retries: 1,
          retryDelayMs: 250,
        }),
        fetchJson<{ templates: Template[] }>("/api/admin/notifications/templates", {
          cache: "no-store",
          timeoutMs: 15_000,
          retries: 1,
          retryDelayMs: 250,
        }),
      ]);
      setHealth(healthData);
      setTemplates(templatesData.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
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
      setError(err instanceof Error ? err.message : "Failed to save template");
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
      ) : error ? (
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 text-sm text-red-600">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold text-cb-text-strong"
          >
            Retry / إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="font-semibold text-cb-text-strong">Canonical Host</p>
              <p className="mt-1 text-sm text-cb-text">{health?.canonical_host}</p>
            </article>
            <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
              <p className="font-semibold text-cb-text-strong">Env Status</p>
              <p className="mt-1 text-sm text-cb-text">
                {health?.env.ok ? "Healthy" : `Missing: ${health?.env.missing.join(", ")}`}
              </p>
            </article>
          </div>

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

