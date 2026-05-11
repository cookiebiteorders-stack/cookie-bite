"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

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

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);

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

  return (
    <section className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">Audit Logs</h1>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          Immutable activity history for admin-sensitive actions.
        </p>
      </header>

      <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            placeholder="Module (orders, products...)"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none ring-0 placeholder:text-cb-text-muted focus:border-cb-border-strong"
          />
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Action (order.update...)"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none ring-0 placeholder:text-cb-text-muted focus:border-cb-border-strong"
          />
          <input
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder="Entity ID"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm outline-none ring-0 placeholder:text-cb-text-muted focus:border-cb-border-strong"
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

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-cb-border">
            <thead className="bg-cb-surface-2">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cb-border text-sm text-cb-text">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-cb-text-muted" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="px-4 py-4 text-red-600" colSpan={7}>
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-cb-text-muted" colSpan={7}>
                    No logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{log.actor_email ?? "System"}</td>
                    <td className="px-4 py-3">{log.actor_role ?? "-"}</td>
                    <td className="px-4 py-3">{log.module}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.entity_id ?? "-"}</td>
                    <td className="px-4 py-3">{log.ip ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-cb-border bg-cb-surface-elevated px-4 py-3 text-sm">
        <p className="text-cb-text-muted">
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
  );
}
