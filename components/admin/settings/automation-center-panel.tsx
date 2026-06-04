"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  RefreshCw,
  Workflow,
  Wrench,
} from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { useAdminT } from "@/lib/admin/use-admin-t";
import {
  AUTOMATION_JOBS,
  AUTOMATION_PIPELINES,
  type AutomationJobId,
} from "@/lib/admin/automation/registry";
import { AdminBadge } from "@/components/admin/admin-badge";
import { cn } from "@/lib/utils";

type AutomationStatus = {
  cronConfigured: boolean;
  resendConfigured: boolean;
  redisConfigured: boolean;
  emailAutomationEnabled: boolean;
  queues: {
    notificationJobsPending: number;
    emailQueuePending: number;
    failedEmailsOpen: number;
    abandonedCartsAwaitingReminder1: number;
  };
  eventMappings: { event_name: string; template_key: string; is_active: boolean }[];
  mappingIssues: string[];
  eventLogs24h: { sent: number; failed: number; skipped: number };
  notificationFailures24h: number;
};

export function AutomationCenterPanel() {
  const { adminT } = useAdminT();
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyJob, setBusyJob] = useState<AutomationJobId | "sync" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchJson<AutomationStatus & { ok: boolean }>(
        "/api/admin/automation/status",
        { cache: "no-store" },
      );
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runJob(jobId: AutomationJobId) {
    setBusyJob(jobId);
    setMessage(null);
    try {
      const res = await fetchJson<{ ok: boolean; result: Record<string, unknown> }>(
        "/api/admin/automation/run",
        { method: "POST", jsonBody: { job: jobId, limit: 25 } },
      );
      setMessage(adminT("settings.automation.runOk", { job: jobId }));
      setLastRun((prev) => ({
        ...prev,
        [jobId]: JSON.stringify(res.result).slice(0, 200),
      }));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : adminT("settings.automation.runFailed"));
    } finally {
      setBusyJob(null);
    }
  }

  async function syncEmailTemplates() {
    setBusyJob("sync");
    setMessage(null);
    try {
      const res = await fetchJson<{ ok: boolean; mapped: number; sync: { synced: number } }>(
        "/api/admin/email/templates/sync-and-map",
        { method: "POST" },
      );
      setMessage(
        adminT("settings.automation.syncOk", {
          synced: res.sync?.synced ?? 0,
          mapped: res.mapped ?? 0,
        }),
      );
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : adminT("settings.automation.syncFailed"));
    } finally {
      setBusyJob(null);
    }
  }

  if (loading && !status) {
    return (
      <p className="flex items-center gap-2 text-sm text-stone-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        {adminT("settings.automation.loading")}
      </p>
    );
  }

  const s = status;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
            <Workflow className="h-5 w-5 text-amber-700" />
            {adminT("settings.automation.title")}
          </h2>
          <p className="mt-1 text-sm text-stone-600">{adminT("settings.automation.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          {adminT("settings.refresh")}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
          {message}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={adminT("settings.automation.stats.notifQueue")}
          value={String(s?.queues.notificationJobsPending ?? 0)}
          warn={(s?.queues.notificationJobsPending ?? 0) > 0}
        />
        <StatCard
          label={adminT("settings.automation.stats.emailQueue")}
          value={String(s?.queues.emailQueuePending ?? 0)}
          warn={(s?.queues.emailQueuePending ?? 0) > 0}
        />
        <StatCard
          label={adminT("settings.automation.stats.failedEmail")}
          value={String(s?.queues.failedEmailsOpen ?? 0)}
          warn={(s?.queues.failedEmailsOpen ?? 0) > 0}
        />
        <StatCard
          label={adminT("settings.automation.stats.abandoned")}
          value={String(s?.queues.abandonedCartsAwaitingReminder1 ?? 0)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminBadge tone={s?.cronConfigured ? "success" : "danger"}>
          {s?.cronConfigured
            ? adminT("settings.cronConfigured")
            : adminT("settings.cronNotConfigured")}
        </AdminBadge>
        <AdminBadge tone={s?.resendConfigured ? "success" : "warning"}>
          {s?.resendConfigured ? "Resend ✓" : "Resend ✗"}
        </AdminBadge>
        <AdminBadge tone={s?.redisConfigured ? "info" : "neutral"}>
          Redis {s?.redisConfigured ? "✓" : "—"}
        </AdminBadge>
        <AdminBadge tone={s?.emailAutomationEnabled ? "success" : "warning"}>
          {adminT("settings.automation.emailAutomation")}:{" "}
          {s?.emailAutomationEnabled ? "ON" : "OFF"}
        </AdminBadge>
      </div>

      {(s?.mappingIssues.length ?? 0) > 0 ? (
        <div className="admin-alert admin-alert--warning rounded-2xl border p-4 text-sm">
          <p className="font-bold">{adminT("settings.automation.mappingIssues")}</p>
          <ul className="mt-2 list-inside list-disc text-xs">
            {s?.mappingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busyJob !== null}
            onClick={() => void syncEmailTemplates()}
            className="mt-3 rounded-xl bg-cb-terracotta-dark px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {busyJob === "sync"
              ? adminT("settings.automation.syncing")
              : adminT("settings.automation.syncTemplates")}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
          <p className="inline-flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {adminT("settings.automation.mappingsOk")}
          </p>
          <button
            type="button"
            disabled={busyJob !== null}
            onClick={() => void syncEmailTemplates()}
            className="mt-2 text-xs font-bold underline"
          >
            {adminT("settings.automation.syncTemplates")}
          </button>
        </div>
      )}

      <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
        <h3 className="font-serif text-xl font-bold">{adminT("settings.automation.pipelinesTitle")}</h3>
        <p className="mt-1 text-xs text-stone-600">{adminT("settings.automation.pipelinesSub")}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {AUTOMATION_PIPELINES.map((pipe) => (
            <article key={pipe.id} className="rounded-2xl border border-cb-border bg-white/90 p-4 text-sm">
              <p className="font-bold text-stone-900">{adminT(pipe.labelKey)}</p>
              <p className="mt-1 text-xs text-stone-600">{adminT(pipe.triggerKey)}</p>
              <p className="mt-1 text-[11px] text-stone-500">{adminT(pipe.channelsKey)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
        <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold">
          <Clock3 className="h-5 w-5 text-amber-700" />
          {adminT("settings.automation.jobsTitle")}
        </h3>
        <p className="mt-1 text-xs text-stone-600">{adminT("settings.automation.jobsSub")}</p>
        <div className="mt-4 space-y-3">
          {AUTOMATION_JOBS.map((job) => (
            <article
              key={job.id}
              className="flex flex-col gap-3 rounded-2xl border border-cb-border bg-white/90 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold text-stone-900">{adminT(job.labelKey)}</p>
                <p className="text-xs text-stone-600">{adminT(job.descKey)}</p>
                <p className="mt-1 font-mono text-[10px] text-stone-500">
                  POST {job.cronPath} · {adminT(job.scheduleKey)}
                </p>
                <p className="text-[10px] text-stone-500">{adminT(job.triggerKey)}</p>
                {lastRun[job.id] ? (
                  <p className="mt-1 font-mono text-[10px] text-emerald-800">{lastRun[job.id]}</p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={busyJob !== null}
                onClick={() => void runJob(job.id)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cb-border-strong bg-cb-terracotta-dark px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {busyJob === job.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {adminT("settings.automation.runNow")}
              </button>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs text-stone-600">{adminT("settings.automation.cronHint")}</p>
      </section>

      <section className="rounded-2xl border border-dashed border-cb-border p-4">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold">
          <Wrench className="h-4 w-4" />
          {adminT("settings.automation.logsTitle")}
        </h3>
        <p className="mt-2 text-xs text-stone-600">
          {adminT("settings.automation.logs24h", {
            sent: s?.eventLogs24h.sent ?? 0,
            failed: s?.eventLogs24h.failed ?? 0,
            skipped: s?.eventLogs24h.skipped ?? 0,
            notifFailed: s?.notificationFailures24h ?? 0,
          })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/email"
            className="rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold hover:border-amber-300"
          >
            {adminT("settings.quickLinks.email")}
          </Link>
          <Link
            href="/admin/email/logs"
            className="rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold hover:border-amber-300"
          >
            {adminT("settings.automation.emailLogs")}
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        warn ? "border-amber-300 bg-amber-50/80" : "border-cb-border bg-white/90",
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-600">{label}</p>
      <p className="mt-2 flex items-center gap-2 font-serif text-2xl font-bold text-stone-950">
        {warn ? <AlertTriangle className="h-5 w-5 text-amber-700" /> : null}
        {value}
      </p>
    </article>
  );
}
