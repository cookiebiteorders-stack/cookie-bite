"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Server,
  XCircle,
} from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type Tab = "dashboard" | "logs" | "failed" | "queue" | "settings" | "templates";

const TABS: { id: Tab; href: string; label: string }[] = [
  { id: "dashboard", href: "/admin/email", label: "لوحة التحكم" },
  { id: "logs", href: "/admin/email/logs", label: "السجلات" },
  { id: "failed", href: "/admin/email/failed", label: "فاشلة" },
  { id: "queue", href: "/admin/email/queue", label: "الطابور" },
  { id: "settings", href: "/admin/email/settings", label: "SMTP / المزودون" },
  { id: "templates", href: "/admin/template-library", label: "القوالب" },
];

type DashboardData = {
  stats: { sent24h: number; failedOpen: number; queuePending: number };
  providers: Array<{ id: string; configured: boolean }>;
  health: Array<{ provider: string; status: string; latency_ms?: number; checked_at: string }>;
  automationEnabled: boolean;
  redis: boolean;
};

function StatusDot({ status }: { status: string }) {
  const color =
    status === "healthy" || status === "sent"
      ? "bg-emerald-500"
      : status === "degraded" || status === "partial"
        ? "bg-amber-500"
        : "bg-red-500";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} aria-hidden />;
}

export function EmailAdminHub({ activeTab }: { activeTab: Tab }) {
  const pathname = usePathname();
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [failed, setFailed] = useState<Record<string, unknown>[]>([]);
  const [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const d = await fetchJson<DashboardData & { ok?: boolean }>("/api/admin/email/dashboard");
        setDash(d);
      } else if (activeTab === "logs") {
        const r = await fetchJson<{ rows: Record<string, unknown>[] }>("/api/admin/email/logs");
        setLogs(r.rows);
      } else if (activeTab === "failed") {
        const r = await fetchJson<{ rows: Record<string, unknown>[] }>("/api/admin/email/failed");
        setFailed(r.rows);
      } else if (activeTab === "queue") {
        const r = await fetchJson<{ rows: Record<string, unknown>[] }>("/api/admin/email/queue");
        setQueue(r.rows);
      } else if (activeTab === "settings") {
        const r = await fetchJson<{ settings: Record<string, unknown> }>("/api/admin/email/settings");
        setSettings(r.settings);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setBusy(true);
    try {
      const r = await fetchJson<{ ok: boolean; error?: string; provider?: string }>(
        "/api/admin/email/test",
        { method: "POST", jsonBody: { to: testEmail.trim(), runHealth: true } },
      );
      setToast(r.ok ? `تم الإرسال عبر ${r.provider ?? "—"}` : r.error ?? "فشل");
      void load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل");
    } finally {
      setBusy(false);
    }
  };

  const retryFailed = async (id: string) => {
    setBusy(true);
    try {
      await fetchJson("/api/admin/email/failed", { method: "POST", jsonBody: { id } });
      setToast("تمت إعادة المحاولة");
      void load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشل");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6 pb-16">
      <div className="admin-panel-surface rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-900/90">Email Ops</p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-cb-text-strong">أتمتة البريد</h1>
            <p className="mt-1 text-sm text-cb-text-muted">
              إرسال، طابور، إعادة محاولة، مراقبة المزودين، وإصلاح ذاتي
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
              تحديث
            </button>
          </div>
        </div>
        <nav className="mt-4 flex flex-wrap gap-1 border-t border-cb-border pt-4">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                pathname === t.href || (t.href === "/admin/email" && pathname === "/admin/email")
                  ? "bg-cb-brand-100 text-cb-brand-900"
                  : "text-cb-text-muted hover:bg-cb-surface",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {toast ? (
        <p className="rounded-xl border border-cb-border bg-cb-brand-50 px-4 py-2 text-sm font-semibold text-cb-brand-900">
          {toast}
          <button type="button" className="ms-2 underline" onClick={() => setToast(null)}>
            إغلاق
          </button>
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cb-brand-600" aria-hidden />
        </div>
      ) : null}

      {!loading && activeTab === "dashboard" && dash ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "مرسل (24س)", value: dash.stats.sent24h, icon: Send },
              { label: "فاشلة مفتوحة", value: dash.stats.failedOpen, icon: AlertTriangle },
              { label: "طابور", value: dash.stats.queuePending, icon: Server },
              {
                label: "أتمتة",
                value: dash.automationEnabled ? "مفعّلة" : "معطّلة",
                icon: Activity,
              },
            ].map((c) => (
              <div
                key={c.label}
                className="admin-panel-surface flex items-center gap-3 rounded-2xl p-4"
              >
                <c.icon className="h-8 w-8 text-cb-brand-600" aria-hidden />
                <div>
                  <p className="text-xs text-cb-text-muted">{c.label}</p>
                  <p className="text-xl font-bold text-cb-text-strong">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="admin-panel-surface rounded-2xl p-4">
              <h2 className="text-sm font-bold text-cb-text-strong">المزودون</h2>
              <ul className="mt-3 space-y-2">
                {dash.providers.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-cb-border px-3 py-2 text-xs"
                  >
                    <span className="font-bold uppercase">{p.id}</span>
                    {p.configured ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> جاهز
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-stone-500">
                        <XCircle className="h-3.5 w-3.5" aria-hidden /> غير مضبوط
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-cb-text-muted">
                Redis: {dash.redis ? "متصل" : "غير متاح — يُستخدم طابور DB"}
              </p>
            </div>

            <div className="admin-panel-surface rounded-2xl p-4">
              <h2 className="text-sm font-bold text-cb-text-strong">صحة المزودين</h2>
              <ul className="mt-3 max-h-48 space-y-2 overflow-auto">
                {dash.health.length === 0 ? (
                  <li className="text-xs text-cb-text-muted">لا فحوصات بعد — شغّل cron email-health</li>
                ) : (
                  dash.health.map((h) => (
                    <li
                      key={`${h.provider}-${h.checked_at}`}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="flex items-center gap-2 font-bold">
                        <StatusDot status={h.status} />
                        {h.provider}
                      </span>
                      <span className="text-cb-text-muted">
                        {h.latency_ms != null ? `${h.latency_ms}ms` : "—"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <div className="admin-panel-surface rounded-2xl p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Mail className="h-4 w-4" aria-hidden />
              اختبار الإرسال
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-w-[200px] flex-1 rounded-xl border border-cb-border px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendTest()}
                className="admin-btn-primary rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
              >
                إرسال + فحص صحة
              </button>
            </div>
          </div>
        </>
      ) : null}

      {!loading && activeTab === "logs" ? (
        <DataTable
          rows={logs}
          columns={["recipient", "subject", "provider", "status", "created_at"]}
        />
      ) : null}

      {!loading && activeTab === "failed" ? (
        <div className="space-y-2">
          {failed.map((r) => (
            <div
              key={String(r.id)}
              className="admin-panel-surface flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-xs"
            >
              <div>
                <p className="font-bold">{String(r.recipient)}</p>
                <p className="text-cb-text-muted">{String(r.subject)}</p>
                <p className="text-red-700">{String(r.error_message)}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void retryFailed(String(r.id))}
                className="admin-btn-secondary rounded-lg px-3 py-1.5 font-bold"
              >
                إعادة محاولة
              </button>
            </div>
          ))}
          {failed.length === 0 ? (
            <p className="text-center text-sm text-cb-text-muted">لا رسائل فاشلة</p>
          ) : null}
        </div>
      ) : null}

      {!loading && activeTab === "queue" ? (
        <DataTable
          rows={queue}
          columns={["recipient", "subject", "status", "provider", "attempts", "created_at"]}
        />
      ) : null}

      {!loading && activeTab === "settings" && settings ? (
        <div className="admin-panel-surface space-y-3 rounded-2xl p-4 text-sm">
          <p>
            <span className="font-bold">المزود النشط:</span> {String(settings.active_provider)}
          </p>
          <p>
            <span className="font-bold">الأولوية:</span>{" "}
            {Array.isArray(settings.provider_priority)
              ? (settings.provider_priority as string[]).join(" → ")
              : "—"}
          </p>
          <p>
            <span className="font-bold">Fallback تلقائي:</span>{" "}
            {settings.auto_fallback_enabled ? "نعم" : "لا"}
          </p>
          <p>
            <span className="font-bold">إصلاح ذاتي:</span>{" "}
            {settings.self_heal_enabled ? "نعم" : "لا"}
          </p>
          <p className="text-xs text-cb-text-muted">
            عدّل المزودين عبر .env: RESEND_API_KEY, SMTP_*, SENDGRID_*, MAILGUN_* — أو جداول smtp_configs
          </p>
        </div>
      ) : null}
    </section>
  );
}

function DataTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  if (!rows.length) {
    return <p className="text-center text-sm text-cb-text-muted">لا بيانات</p>;
  }
  return (
    <div className="overflow-auto rounded-2xl border border-cb-border">
      <table className="min-w-full text-start text-xs">
        <thead className="bg-cb-surface-elevated">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-bold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t border-cb-border/60">
              {columns.map((c) => (
                <td key={c} className="max-w-[200px] truncate px-3 py-2">
                  {String(r[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
