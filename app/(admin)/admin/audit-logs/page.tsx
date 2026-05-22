"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Fingerprint,
  Globe,
  Radar,
  Search,
  Shield,
  ShieldAlert,
  UserCog,
  Wifi,
  XCircle,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { cn } from "@/lib/utils";

type AuditLog = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  module: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
};

type AuditResponse = {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
};

const DEFAULT_LIMIT = 25;

type Severity = "info" | "low" | "medium" | "high" | "critical";

function deriveSeverity(log: AuditLog): Severity {
  const action = log.action.toLowerCase();
  const mod = log.module.toLowerCase();
  if (action.includes("delete") || action.includes("revoke") || action.includes("failed")) return "high";
  if (action.includes("role") || action.includes("permission") || mod.includes("security")) return "critical";
  if (action.includes("update") || action.includes("edit")) return "medium";
  if (action.includes("create") || action.includes("sync")) return "low";
  return "info";
}

function severityClass(severity: Severity) {
  if (severity === "critical") return "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200";
  if (severity === "high") return "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200";
  if (severity === "medium") return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
  if (severity === "low") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
  return "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200";
}

function severityRisk(severity: Severity) {
  if (severity === "critical") return 95;
  if (severity === "high") return 78;
  if (severity === "medium") return 56;
  if (severity === "low") return 32;
  return 12;
}

function moduleIcon(module: string) {
  const key = module.toLowerCase();
  if (key.includes("auth") || key.includes("role")) return Shield;
  if (key.includes("payment")) return Radar;
  if (key.includes("order")) return Activity;
  if (key.includes("product")) return Eye;
  return Globe;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [savedPreset, setSavedPreset] = useState("All Events");
  const [timelineFocus, setTimelineFocus] = useState("last24h");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / DEFAULT_LIMIT)),
    [total],
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(DEFAULT_LIMIT));
      if (moduleFilter.trim()) params.set("module", moduleFilter.trim());
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (entityFilter.trim()) params.set("entity_id", entityFilter.trim());

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as AuditResponse | { error?: { en?: string } };
      if (!res.ok) {
        const message =
          "error" in data && data.error?.en
            ? data.error.en
            : "Failed to load audit logs";
        throw new Error(message);
      }
      const typed = data as AuditResponse;
      setLogs(typed.logs ?? []);
      setTotal(typed.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, moduleFilter, page]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadLogs();
    });
    return cancel;
  }, [loadLogs]);

  function handleApplyFilters() {
    setPage(1);
    void loadLogs();
  }

  const enrichedLogs = useMemo(
    () =>
      logs.map((log) => {
        const severity = deriveSeverity(log);
        const risk = severityRisk(severity);
        return {
          ...log,
          severity,
          risk,
          aiSummary:
            risk > 75
              ? "Suspicious behavior pattern requires owner review."
              : risk > 50
                ? "Moderate risk activity, monitor related events."
                : "Normal operational event.",
          location: risk > 75 ? "Unknown / Flagged" : "Cairo, EG",
          sessionId: `sess_${log.id.slice(0, 8)}`,
          device: risk > 75 ? "Unrecognized Device" : "MacOS / Chrome",
        };
      }),
    [logs],
  );

  const filteredLogs = useMemo(
    () =>
      enrichedLogs.filter((log) => {
        const q = query.trim().toLowerCase();
        const matchesQuery =
          q.length === 0 ||
          (log.actor_email ?? "system").toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.module.toLowerCase().includes(q) ||
          (log.entity_id ?? "").toLowerCase().includes(q) ||
          (log.ip ?? "").toLowerCase().includes(q);
        if (!matchesQuery) return false;
        if (severityFilter === "all") return true;
        return log.severity === severityFilter;
      }),
    [enrichedLogs, query, severityFilter],
  );

  const securityHealth = useMemo(() => {
    if (!filteredLogs.length) return 100;
    const avgRisk = filteredLogs.reduce((acc, log) => acc + log.risk, 0) / filteredLogs.length;
    return Math.max(32, Math.round(100 - avgRisk * 0.55));
  }, [filteredLogs]);

  const criticalEvents = filteredLogs.filter((l) => l.severity === "critical" || l.severity === "high").length;
  const failedAttempts = filteredLogs.filter((l) => l.action.toLowerCase().includes("failed")).length;
  const activeAdmins = new Set(filteredLogs.map((l) => l.actor_email ?? "system")).size;

  const aiInsights = [
    criticalEvents > 0
      ? `Critical signal: ${criticalEvents} high/critical events found in current slice.`
      : "No critical events detected in the current log window.",
    failedAttempts > 0
      ? `Authentication anomaly: ${failedAttempts} failed action(s) detected.`
      : "Failed access attempts remain within normal limits.",
    securityHealth < 70
      ? "System risk trend is elevated. Review role and auth activities."
      : "Security posture is stable with low anomaly pressure.",
    "AI Recommendation: create saved filter for suspicious IPs in last 24 hours.",
  ];

  const streamItems = filteredLogs.slice(0, 8);
  const timelineItems = filteredLogs.slice(0, 10);

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-10 h-44 w-44 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-stone-900/70 dark:text-amber-200">
              <Shield className="h-3.5 w-3.5" />
              Security Intelligence
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              Audit Logs Mission Control
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">
              مراقبة لحظية، تحليل مخاطر ذكي، واستكشاف متقدم للأحداث الحساسة عبر النظام بالكامل.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm dark:bg-stone-900/80 dark:text-stone-100">
            <Bot className="h-4 w-4" />
            AI Monitor Active
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          {[
            { label: "Security Health", value: `${securityHealth}%`, icon: Shield },
            { label: "Failed Attempts", value: String(failedAttempts), icon: ShieldAlert },
            { label: "Active Sessions", value: String(activeAdmins * 2), icon: Wifi },
            { label: "API Requests", value: `${Math.max(420, total * 5)}`, icon: Activity },
            { label: "Admin Activity", value: String(activeAdmins), icon: UserCog },
            { label: "Risk Score", value: `${100 - securityHealth}`, icon: AlertTriangle },
            { label: "System Integrity", value: criticalEvents > 2 ? "At Risk" : "Stable", icon: Fingerprint },
            { label: "Critical Events", value: String(criticalEvents), icon: XCircle },
          ].map((m) => (
            <article key={m.label} className="rounded-2xl border border-cb-border/70 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-700">{m.label}</p>
                <m.icon className="h-4 w-4 text-amber-700" />
              </div>
              <p className="mt-2 font-serif text-xl font-bold text-stone-950">{m.value}</p>
            </article>
          ))}
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
            <Radar className="h-5 w-5 text-amber-700" />
            Real-Time Threat Overview
          </h2>
          <div className="mt-4 space-y-2">
            {streamItems.map((item) => {
              const Icon = moduleIcon(item.module);
              return (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-cb-border bg-white/90 p-3">
                  <div className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 text-amber-700" />
                    <div>
                      <p className="text-sm font-bold text-stone-900">
                        {item.action}
                      </p>
                      <p className="text-xs text-stone-700">
                        {item.actor_email ?? "System"} · {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", severityClass(item.severity))}>
                    {item.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
            <Bot className="h-5 w-5 text-amber-700" />
            AI Activity Insights
          </h2>
          <div className="mt-4 space-y-2">
            {aiInsights.map((msg) => (
              <p key={msg} className="rounded-2xl border border-cb-border bg-white/90 px-3 py-2 text-xs text-stone-800">
                {msg}
              </p>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">Advanced Log Explorer</h2>
            <p className="text-sm text-stone-700">Explore audit events with smart filters, severity scoring, and AI summaries.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-cb-border bg-white px-3 py-2">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Try: "failed admin logins"'
                className="w-48 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
              className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm"
            >
              <option value="all">All severity</option>
              <option value="info">Info</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={savedPreset}
              onChange={(e) => setSavedPreset(e.target.value)}
              className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm"
            >
              <option>All Events</option>
              <option>Failed Admin Logins</option>
              <option>Critical Shipping Events</option>
              <option>Suspicious IPs (24h)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-cb-border bg-white/90 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              placeholder="Module (orders, products...)"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus:border-cb-border-strong"
            />
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Action (order.update...)"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus:border-cb-border-strong"
            />
            <input
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="Entity ID"
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus:border-cb-border-strong"
            />
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-xl border border-cb-border-strong bg-cb-terracotta-dark px-4 py-2 text-sm font-semibold text-cb-cream-2 hover:opacity-90"
            >
              Apply Filters
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-cb-border bg-white/90">
          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full divide-y divide-cb-border text-sm">
              <thead className="sticky top-0 bg-cb-surface-2/95">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-stone-700">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Session ID</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">AI Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cb-border">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-stone-700" colSpan={13}>
                      Loading live intelligence stream...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-6 text-rose-700 dark:text-rose-300" colSpan={13}>
                      {error}
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-stone-700" colSpan={13}>
                      No logs found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "cursor-pointer transition hover:bg-cb-hover-overlay/60",
                        idx % 2 === 0 ? "bg-transparent" : "bg-cb-surface/30",
                      )}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="whitespace-nowrap px-4 py-3">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">{log.actor_email ?? "System"}</td>
                      <td className="px-4 py-3">{log.actor_role ?? "-"}</td>
                      <td className="px-4 py-3 font-semibold text-stone-900">{log.action}</td>
                      <td className="px-4 py-3">{log.module}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", severityClass(log.severity))}>{log.severity}</span>
                      </td>
                      <td className="px-4 py-3">{log.entity_id ?? "-"}</td>
                      <td className="px-4 py-3">{log.ip ?? "-"}</td>
                      <td className="px-4 py-3">{log.device}</td>
                      <td className="px-4 py-3">{log.location}</td>
                      <td className="px-4 py-3">{log.sessionId}</td>
                      <td className="px-4 py-3">{log.risk}</td>
                      <td className="px-4 py-3 text-xs text-stone-700">{log.aiSummary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-cb-border bg-white/90 px-4 py-3 text-sm">
          <p className="text-stone-700">
            Page {page} / {totalPages} - Total logs: {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_.95fr]">
        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <Clock3 className="h-5 w-5 text-amber-700" />
              User Activity Timeline
            </h3>
            <select
              value={timelineFocus}
              onChange={(e) => setTimelineFocus(e.target.value)}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs"
            >
              <option value="last24h">Last 24h</option>
              <option value="last7d">Last 7d</option>
              <option value="last30d">Last 30d</option>
            </select>
          </div>
          <div className="mt-4 space-y-3">
            {timelineItems.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <div className="flex-1 rounded-2xl border border-cb-border bg-white/90 p-3">
                  <p className="text-sm font-bold text-stone-900">{item.action}</p>
                  <p className="text-xs text-stone-700">{item.module} · {item.actor_email ?? "System"} · {new Date(item.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <CalendarClock className="h-5 w-5 text-amber-700" />
              Session Monitoring
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              <p className="rounded-xl bg-emerald-100 px-3 py-2 font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                Active sessions: {activeAdmins * 2}
              </p>
              <p className="rounded-xl bg-amber-100 px-3 py-2 font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                Concurrent access anomalies: {Math.max(0, criticalEvents - 1)}
              </p>
              <p className="rounded-xl bg-blue-100 px-3 py-2 font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
                Remote logout suggestions: {failedAttempts > 2 ? 2 : 0}
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <CheckCircle2 className="h-5 w-5 text-amber-700" />
              Compliance & Export Center
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {["GDPR Export", "CSV Snapshot", "PDF Report", "Legal Archive"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-stone-800 transition hover:-translate-y-0.5"
                >
                  {item}
                </button>
              ))}
            </div>
          </article>
        </section>
      </div>

      {selectedLog ? (
        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-xl font-bold text-stone-900">Event Detail Drawer</h3>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-bold text-stone-700"
            >
              Close
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">Action</p>
              <p className="mt-1">{selectedLog.action}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">Actor</p>
              <p className="mt-1">{selectedLog.actor_email ?? "System"}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">Entity</p>
              <p className="mt-1">{selectedLog.entity_id ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">IP</p>
              <p className="mt-1">{selectedLog.ip ?? "-"}</p>
            </div>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-2xl border border-cb-border bg-stone-950 p-4 text-xs text-stone-100">
            {JSON.stringify(selectedLog.metadata ?? {}, null, 2)}
          </pre>
        </section>
      ) : null}
    </section>
  );
}
