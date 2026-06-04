"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Globe,
  Radar,
  Search,
  Shield,
  ShieldAlert,
  UserCog,
  XCircle,
} from "lucide-react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { formatAuditAction, formatAuditModule } from "@/lib/admin/format-audit-event";
import {
  buildAuditCsv,
  deriveSeverity,
  parseUserAgent,
  severityClass,
  timelineFromIso,
  type AuditLogRow,
  type AuditSeverity,
} from "@/lib/admin/audit-display";
import { printAuditLogsTable } from "@/lib/admin/audit-export-print";

const DEFAULT_LIMIT = 25;

type AuditPresetId = "all" | "failedLogins" | "criticalShipping" | "suspiciousIps";

type AuditStats = {
  failedAttempts: number;
  criticalEvents: number;
  highEvents: number;
  uniqueActors: number;
  securityHealth: number;
  topModules: { module: string; count: number }[];
  sampleSize: number;
};

type AuditResponse = {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  stats?: AuditStats;
  modules?: string[];
};

function moduleIcon(module: string) {
  const key = module.toLowerCase();
  if (key.includes("auth") || key.includes("role")) return Shield;
  if (key.includes("payment")) return Radar;
  if (key.includes("order")) return Activity;
  if (key.includes("product")) return Eye;
  return Globe;
}

function presetToApi(preset: AuditPresetId): string {
  if (preset === "suspiciousIps") return "suspiciousIps";
  return preset;
}

export function AuditLogsDashboard() {
  const { adminT, apiErr, t, lang } = useAdminT();
  const searchParams = useSearchParams();
  const initialModule = searchParams.get("module")?.trim() ?? "";

  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [moduleOptions, setModuleOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [moduleFilter, setModuleFilter] = useState(initialModule);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | AuditSeverity>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);
  const [savedPreset, setSavedPreset] = useState<AuditPresetId>("all");
  const [timelineFocus, setTimelineFocus] = useState<"last24h" | "last7d" | "last30d">("last24h");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / DEFAULT_LIMIT)),
    [total],
  );

  useEffect(() => {
    const id = window.setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => window.clearTimeout(id);
  }, [search]);

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
      if (searchDebounced) params.set("search", searchDebounced);
      if (savedPreset !== "all") params.set("preset", presetToApi(savedPreset));
      if (savedPreset === "all") {
        params.set("from", timelineFromIso(timelineFocus));
      }

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as AuditResponse | { error?: { en?: string; ar?: string } };
      if (!res.ok) {
        throw new Error(apiErr("error" in data ? data.error : undefined, adminT("audit.errors.loadFailed")));
      }
      const typed = data as AuditResponse;
      setLogs(typed.logs ?? []);
      setTotal(typed.total ?? 0);
      setStats(typed.stats ?? null);
      setModuleOptions(typed.modules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : adminT("audit.errors.unknown"));
      setLogs([]);
      setTotal(0);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [
    actionFilter,
    apiErr,
    adminT,
    entityFilter,
    moduleFilter,
    page,
    savedPreset,
    searchDebounced,
    timelineFocus,
  ]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadLogs();
    });
    return cancel;
  }, [loadLogs]);

  function handleApplyFilters() {
    if (page !== 1) setPage(1);
    else void loadLogs();
  }

  function handlePresetChange(preset: AuditPresetId) {
    setSavedPreset(preset);
    setPage(1);
    if (preset === "failedLogins") {
      setActionFilter("failed");
      setModuleFilter("");
    } else if (preset === "criticalShipping") {
      setModuleFilter("shipping");
      setActionFilter("");
    } else if (preset === "suspiciousIps") {
      setTimelineFocus("last24h");
      setActionFilter("");
      setModuleFilter("");
    } else {
      setActionFilter("");
    }
  }

  const displayLogs = useMemo(() => {
    return logs
      .map((log) => ({ ...log, severity: deriveSeverity(log) }))
      .filter((log) => severityFilter === "all" || log.severity === severityFilter);
  }, [logs, severityFilter]);

  const formatRow = useCallback(
    (log: AuditLogRow) => ({
      action: formatAuditAction(log.action, adminT),
      module: formatAuditModule(log.module, adminT),
      severity: adminT(`audit.severity.${deriveSeverity(log)}`),
    }),
    [adminT],
  );

  const aiInsights = useMemo(() => {
    const s = stats;
    const critical = s?.criticalEvents ?? 0;
    const failed = s?.failedAttempts ?? 0;
    const health = s?.securityHealth ?? 100;
    const top = s?.topModules?.[0];
    const msgs = [
      critical > 0
        ? adminT("audit.aiInsights.critical", { count: critical })
        : adminT("audit.aiInsights.noCritical"),
      failed > 0
        ? adminT("audit.aiInsights.authAnomaly", { count: failed })
        : adminT("audit.aiInsights.authNormal"),
      health < 70 ? adminT("audit.aiInsights.riskElevated") : adminT("audit.aiInsights.riskStable"),
    ];
    if (top) {
      msgs.push(adminT("audit.aiInsights.topModule", { module: formatAuditModule(top.module, adminT), count: top.count }));
    }
    msgs.push(adminT("audit.aiInsights.sampleNote", { n: s?.sampleSize ?? 0 }));
    return msgs;
  }, [adminT, stats]);

  const auditPresets = useMemo(
    () =>
      [
        { id: "all" as const, label: adminT("audit.presets.all") },
        { id: "failedLogins" as const, label: adminT("audit.presets.failedLogins") },
        { id: "criticalShipping" as const, label: adminT("audit.presets.criticalShipping") },
        { id: "suspiciousIps" as const, label: adminT("audit.presets.suspiciousIps") },
      ],
    [adminT],
  );

  const auditStats = useMemo(() => {
    const s = stats;
    const critical = (s?.criticalEvents ?? 0) + (s?.highEvents ?? 0);
    return [
      { label: adminT("audit.stats.securityHealth"), value: `${s?.securityHealth ?? 100}%`, icon: Shield },
      { label: adminT("audit.stats.failedAttempts"), value: String(s?.failedAttempts ?? 0), icon: ShieldAlert },
      { label: adminT("audit.stats.uniqueActors"), value: String(s?.uniqueActors ?? 0), icon: UserCog },
      { label: adminT("audit.stats.totalLogs"), value: String(total), icon: Activity },
      { label: adminT("audit.stats.highEvents"), value: String(s?.highEvents ?? 0), icon: AlertTriangle },
      {
        label: adminT("audit.stats.systemIntegrity"),
        value:
          critical > 2 ? adminT("audit.stats.integrityAtRisk") : adminT("audit.stats.integrityStable"),
        icon: CheckCircle2,
      },
      { label: adminT("audit.stats.criticalEvents"), value: String(s?.criticalEvents ?? 0), icon: XCircle },
    ];
  }, [adminT, stats, total]);

  async function fetchExportBatch(): Promise<AuditLogRow[]> {
    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "500");
    if (moduleFilter.trim()) params.set("module", moduleFilter.trim());
    if (actionFilter.trim()) params.set("action", actionFilter.trim());
    if (entityFilter.trim()) params.set("entity_id", entityFilter.trim());
    if (searchDebounced) params.set("search", searchDebounced);
    if (savedPreset !== "all") params.set("preset", presetToApi(savedPreset));
    if (savedPreset === "all") params.set("from", timelineFromIso(timelineFocus));

    const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, { cache: "no-store" });
    const data = (await res.json()) as AuditResponse;
    if (!res.ok) throw new Error(adminT("audit.errors.exportFailed"));
    return data.logs ?? [];
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const rows = await fetchExportBatch();
      const csv = buildAuditCsv(rows, (log) => formatRow(log));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(adminT("audit.errors.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportJson() {
    setExporting(true);
    try {
      const rows = await fetchExportBatch();
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-gdpr-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(adminT("audit.errors.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      const rows = await fetchExportBatch();
      printAuditLogsTable(rows, {
        title: adminT("audit.compliance.pdf"),
        generated: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB"),
        cols: {
          time: adminT("audit.cols.timestamp"),
          user: adminT("audit.cols.user"),
          role: adminT("audit.cols.role"),
          action: adminT("audit.cols.action"),
          module: adminT("audit.cols.module"),
          entity: adminT("audit.cols.entity"),
          ip: adminT("audit.cols.ip"),
        },
      }, (log) => ({
        time: new Date(log.created_at).toLocaleString(),
        user: log.actor_email ?? adminT("audit.system"),
        role: log.actor_role ?? "—",
        action: formatAuditAction(log.action, adminT),
        module: formatAuditModule(log.module, adminT),
        entity: log.entity_id ?? "—",
        ip: log.ip ?? "—",
      }));
    } catch {
      setError(adminT("audit.errors.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  const streamItems = displayLogs.slice(0, 8);

  return (
    <section className="space-y-6 pb-10">
      <header className="admin-panel-surface relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="admin-panel-scrim" aria-hidden />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-stone-900/70 dark:text-amber-200">
              <Shield className="h-3.5 w-3.5" />
              {adminT("audit.eyebrow")}
            </p>
            <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-950 sm:text-4xl">
              {adminT("audit.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-700">
              {adminT("audit.subtitle")}
            </p>
            <p className="mt-1 text-xs text-stone-600">{adminT("audit.dataNote")}</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-cb-border bg-white/85 px-4 py-2 text-sm font-bold text-stone-900 shadow-sm dark:bg-stone-900/80 dark:text-stone-100">
            <Bot className="h-4 w-4" />
            {adminT("audit.liveFeed")}
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {auditStats.map((m) => (
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
            {adminT("audit.threatTitle")}
          </h2>
          <p className="mt-1 text-xs text-stone-600">{adminT("audit.threatSub")}</p>
          <div className="mt-4 space-y-2">
            {loading && streamItems.length === 0 ? (
              <p className="text-sm text-stone-600">{adminT("audit.loading")}</p>
            ) : streamItems.length === 0 ? (
              <p className="text-sm text-stone-600">{adminT("audit.noLogs")}</p>
            ) : (
              streamItems.map((item) => {
                const Icon = moduleIcon(item.module);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedLog(item)}
                    className="flex w-full items-start justify-between gap-3 rounded-2xl border border-cb-border bg-white/90 p-3 text-left transition hover:border-amber-300"
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 text-amber-700" />
                      <div>
                        <p className="text-sm font-bold text-stone-900">
                          {formatAuditAction(item.action, adminT)}
                        </p>
                        <p className="text-xs text-stone-700">
                          {item.actor_email ?? adminT("audit.system")} ·{" "}
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        severityClass(item.severity),
                      )}
                    >
                      {adminT(`audit.severity.${item.severity}`)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 font-serif text-2xl font-bold text-stone-900">
            <Bot className="h-5 w-5 text-amber-700" />
            {adminT("audit.aiInsightsTitle")}
          </h2>
          <p className="mt-1 text-xs text-stone-600">{adminT("audit.aiInsightsSub")}</p>
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
            <h2 className="font-serif text-2xl font-bold text-stone-900">{adminT("audit.explorerTitle")}</h2>
            <p className="text-sm text-stone-700">{adminT("audit.explorerSub")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-2xl border border-cb-border bg-white px-3 py-2">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={adminT("audit.searchPlaceholder")}
                className="w-48 bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as typeof severityFilter)}
              className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm"
              title={adminT("audit.severityFilterHint")}
            >
              <option value="all">{adminT("audit.severityAll")}</option>
              <option value="info">{adminT("audit.severity.info")}</option>
              <option value="low">{adminT("audit.severity.low")}</option>
              <option value="medium">{adminT("audit.severity.medium")}</option>
              <option value="high">{adminT("audit.severity.high")}</option>
              <option value="critical">{adminT("audit.severity.critical")}</option>
            </select>
            <select
              value={savedPreset}
              onChange={(e) => handlePresetChange(e.target.value as AuditPresetId)}
              className="rounded-xl border border-cb-border bg-white px-3 py-2 text-sm"
            >
              {auditPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-cb-border bg-white/90 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none focus:border-cb-border-strong"
            >
              <option value="">{adminT("audit.moduleAll")}</option>
              {moduleOptions.map((m) => (
                <option key={m} value={m}>
                  {formatAuditModule(m, adminT)} ({m})
                </option>
              ))}
            </select>
            <input
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder={adminT("audit.actionPlaceholder")}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus:border-cb-border-strong"
            />
            <input
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder={adminT("audit.entityPlaceholder")}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none placeholder:text-stone-500 focus:border-cb-border-strong"
            />
            <select
              value={timelineFocus}
              onChange={(e) => {
                setTimelineFocus(e.target.value as typeof timelineFocus);
                setPage(1);
              }}
              disabled={savedPreset !== "all"}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="last24h">{adminT("audit.timeline.last24h")}</option>
              <option value="last7d">{adminT("audit.timeline.last7d")}</option>
              <option value="last30d">{adminT("audit.timeline.last30d")}</option>
            </select>
            <button
              type="button"
              onClick={handleApplyFilters}
              className="rounded-xl border border-cb-border-strong bg-cb-terracotta-dark px-4 py-2 text-sm font-semibold text-cb-cream-2 hover:opacity-90"
            >
              {adminT("audit.applyFilters")}
            </button>
          </div>
        </div>

        <div className="admin-table-scroll mt-4 rounded-2xl border border-cb-border bg-white/90">
            <table className="min-w-[1100px] w-full divide-y divide-cb-border text-sm">
              <thead className="sticky top-0 bg-cb-surface-2/95">
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-stone-700">
                  <th className="px-4 py-3">{adminT("audit.cols.timestamp")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.user")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.role")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.action")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.module")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.severity")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.entity")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.ip")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.browser")}</th>
                  <th className="px-4 py-3">{adminT("audit.cols.details")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cb-border">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-stone-700" colSpan={10}>
                      {adminT("audit.loading")}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td className="px-4 py-6 text-rose-700 dark:text-rose-300" colSpan={10}>
                      {error}
                    </td>
                  </tr>
                ) : displayLogs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-stone-700" colSpan={10}>
                      {adminT("audit.noLogs")}
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "transition hover:bg-cb-hover-overlay/60",
                        idx % 2 === 0 ? "bg-transparent" : "bg-cb-surface/30",
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{log.actor_email ?? adminT("audit.system")}</td>
                      <td className="px-4 py-3">
                        {log.actor_role ? t(`adminRoles.${log.actor_role}`) : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {formatAuditAction(log.action, adminT)}
                      </td>
                      <td className="px-4 py-3">{formatAuditModule(log.module, adminT)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold",
                            severityClass(log.severity),
                          )}
                        >
                          {adminT(`audit.severity.${log.severity}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{log.entity_id ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.ip ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">{parseUserAgent(log.user_agent)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-2 py-1 text-xs font-bold hover:bg-cb-surface"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {adminT("audit.cols.details")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-cb-border bg-white/90 px-4 py-3 text-sm">
          <p className="text-stone-700">
            {adminT("audit.pagination.page", { page, total: totalPages, count: total })}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adminT("audit.pagination.prev")}
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-cb-border px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {adminT("audit.pagination.next")}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_.95fr]">
        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <Clock3 className="h-5 w-5 text-amber-700" />
              {adminT("audit.timeline.title")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-stone-600">{adminT("audit.timeline.hint")}</p>
          <div className="mt-4 space-y-3">
            {displayLogs.slice(0, 12).map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                <button
                  type="button"
                  onClick={() => setSelectedLog(item)}
                  className="flex-1 rounded-2xl border border-cb-border bg-white/90 p-3 text-left transition hover:border-amber-300"
                >
                  <p className="text-sm font-bold text-stone-900">
                    {formatAuditAction(item.action, adminT)}
                  </p>
                  <p className="text-xs text-stone-700">
                    {formatAuditModule(item.module, adminT)} · {item.actor_email ?? adminT("audit.system")} ·{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <CalendarClock className="h-5 w-5 text-amber-700" />
              {adminT("audit.topModulesTitle")}
            </h3>
            <div className="mt-3 space-y-2 text-xs">
              {(stats?.topModules ?? []).length === 0 ? (
                <p className="text-stone-600">{adminT("audit.noLogs")}</p>
              ) : (
                stats?.topModules.map((row) => (
                  <button
                    key={row.module}
                    type="button"
                    onClick={() => {
                      setModuleFilter(row.module);
                      setPage(1);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-cb-border bg-white px-3 py-2 font-bold text-stone-800 hover:border-amber-300"
                  >
                    <span>{formatAuditModule(row.module, adminT)}</span>
                    <span className="text-amber-800">{row.count}</span>
                  </button>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
            <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900">
              <CheckCircle2 className="h-5 w-5 text-amber-700" />
              {adminT("audit.compliance.title")}
            </h3>
            <p className="mt-1 text-xs text-stone-600">{adminT("audit.compliance.hint")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExportJson()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-stone-800 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {adminT("audit.compliance.gdpr")}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExportCsv()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-stone-800 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {adminT("audit.compliance.csv")}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExportPdf()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-stone-800 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                {adminT("audit.compliance.pdf")}
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => void handleExportPdf()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-cb-border bg-white px-3 py-2 text-xs font-bold text-stone-800 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Shield className="h-3.5 w-3.5" />
                {adminT("audit.compliance.legal")}
              </button>
            </div>
          </article>
        </section>
      </div>

      {selectedLog ? (
        <section className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-xl font-bold text-stone-900">{adminT("audit.drawer.title")}</h3>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="rounded-xl border border-cb-border bg-white px-3 py-1.5 text-xs font-bold text-stone-700"
            >
              {adminT("audit.drawer.close")}
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-600">{adminT("audit.drawer.severityNote")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">{adminT("audit.drawer.action")}</p>
              <p className="mt-1">{formatAuditAction(selectedLog.action, adminT)}</p>
              <p className="mt-1 font-mono text-[10px] text-stone-500">{selectedLog.action}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">{adminT("audit.drawer.actor")}</p>
              <p className="mt-1">{selectedLog.actor_email ?? adminT("audit.system")}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">{adminT("audit.drawer.entity")}</p>
              <p className="mt-1 font-mono">{selectedLog.entity_id ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">{adminT("audit.drawer.ip")}</p>
              <p className="mt-1 font-mono">{selectedLog.ip ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs sm:col-span-2">
              <p className="font-bold">{adminT("audit.drawer.userAgent")}</p>
              <p className="mt-1 break-all">{selectedLog.user_agent ?? "—"}</p>
              <p className="mt-1 text-stone-600">{parseUserAgent(selectedLog.user_agent)}</p>
            </div>
            <div className="rounded-2xl border border-cb-border bg-white/90 p-3 text-xs">
              <p className="font-bold">{adminT("audit.cols.severity")}</p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
                  severityClass(deriveSeverity(selectedLog)),
                )}
              >
                {adminT(`audit.severity.${deriveSeverity(selectedLog)}`)}
              </span>
            </div>
          </div>
          {selectedLog.before != null || selectedLog.after != null ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <pre className="overflow-x-auto rounded-2xl border border-cb-border bg-stone-950 p-4 text-xs text-stone-100">
                {adminT("audit.drawer.before")}
                {"\n"}
                {JSON.stringify(selectedLog.before ?? null, null, 2)}
              </pre>
              <pre className="overflow-x-auto rounded-2xl border border-cb-border bg-stone-950 p-4 text-xs text-stone-100">
                {adminT("audit.drawer.after")}
                {"\n"}
                {JSON.stringify(selectedLog.after ?? null, null, 2)}
              </pre>
            </div>
          ) : null}
          <p className="mt-3 text-xs font-bold text-stone-800">{adminT("audit.drawer.metadataTitle")}</p>
          <pre className="mt-1 overflow-x-auto rounded-2xl border border-cb-border bg-stone-950 p-4 text-xs text-stone-100">
            {JSON.stringify(selectedLog.metadata ?? {}, null, 2)}
          </pre>
        </section>
      ) : null}
    </section>
  );
}
