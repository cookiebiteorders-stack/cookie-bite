import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getRecentSessions } from "@/lib/tracking-server/queries";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import {
  formatTrackingDateTime,
  formatTrackingDuration,
} from "@/lib/tracking-server/session-detail";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function durationForRow(session: Record<string, unknown>): number {
  if (session.duration_seconds != null) return Number(session.duration_seconds);
  const started = new Date(String(session.started_at)).getTime();
  const ended = new Date(String(session.last_event_at ?? session.started_at)).getTime();
  return Math.max(0, Math.round((ended - started) / 1000));
}

export default async function AdminSessionsPage() {
  await requireAdminAccess("analytics");
  const sessions = await getRecentSessions(100);

  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsSessions.title"
        subtitleKey="adminPages.analyticsSessions.subtitle"
      />

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-3">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="text-start text-cb-text-muted">
              <tr className="border-b border-cb-border">
                <th className="py-2 pe-3">Started</th>
                <th className="py-2 pe-3">Session</th>
                <th className="py-2 pe-3">Duration</th>
                <th className="py-2 pe-3">IP</th>
                <th className="py-2 pe-3">Device</th>
                <th className="py-2 pe-3">Browser</th>
                <th className="py-2 pe-3">Location</th>
                <th className="py-2 pe-3">Entry</th>
                <th className="py-2 pe-3">Exit</th>
                <th className="py-2 pe-3">Source</th>
                <th className="py-2 pe-3">PVs</th>
                <th className="py-2 pe-3">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const session = s as Record<string, unknown>;
                const id = String(session.session_id);
                const startedAt = String(session.started_at);
                return (
                  <tr
                    key={id}
                    className="border-b border-cb-border last:border-b-0 hover:bg-cb-hover-overlay"
                  >
                    <td className="py-2 pe-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-cb-text-strong">
                        {formatTrackingDateTime(startedAt)}
                      </div>
                      <div className="text-[10px] text-cb-text-muted">{formatRelative(startedAt)}</div>
                    </td>
                    <td className="py-2 pe-3">
                      <Link
                        href={`/admin/analytics/sessions/${encodeURIComponent(id)}`}
                        className="font-mono text-xs text-cb-terracotta-dark hover:underline"
                      >
                        {id.slice(0, 16)}…
                      </Link>
                    </td>
                    <td className="py-2 pe-3 whitespace-nowrap font-semibold">
                      {formatTrackingDuration(durationForRow(session))}
                    </td>
                    <td className="py-2 pe-3 font-mono text-xs">{String(session.ip ?? "—")}</td>
                    <td className="py-2 pe-3 capitalize">{String(session.device_type ?? "—")}</td>
                    <td className="py-2 pe-3">{String(session.browser ?? "—")}</td>
                    <td className="py-2 pe-3 whitespace-nowrap">
                      {String(session.country ?? "—")}
                      {session.city ? ` · ${String(session.city)}` : ""}
                    </td>
                    <td className="py-2 pe-3 max-w-[140px] truncate font-mono text-xs" title={String(session.entry_page ?? "")}>
                      {String(session.entry_page ?? "—")}
                    </td>
                    <td className="py-2 pe-3 max-w-[140px] truncate font-mono text-xs" title={String(session.exit_page ?? "")}>
                      {String(session.exit_page ?? "—")}
                    </td>
                    <td className="py-2 pe-3">{String(session.utm_source ?? "direct")}</td>
                    <td className="py-2 pe-3 font-semibold">{String(session.pageview_count ?? 0)}</td>
                    <td className="py-2 pe-3 font-semibold">{String(session.click_count ?? 0)}</td>
                  </tr>
                );
              })}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-4 text-center text-sm text-cb-text-muted">
                    No sessions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
