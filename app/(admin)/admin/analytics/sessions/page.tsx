import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getRecentSessions } from "@/lib/tracking-server/queries";

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export default async function AdminSessionsPage() {
  await requireAdminAccess("analytics");
  const sessions = await getRecentSessions(80);

  return (
    <div className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">Recent sessions</h1>
        <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">
          The latest 80 non-bot sessions. Click any row to inspect the full timeline.
        </p>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-3">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="text-left text-cb-text-muted">
              <tr className="border-b border-cb-border">
                <th className="py-2 pr-3">Started</th>
                <th className="py-2 pr-3">Session</th>
                <th className="py-2 pr-3">Entry</th>
                <th className="py-2 pr-3">Exit</th>
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">Country</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">PVs</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const session = s as Record<string, unknown>;
                const id = String(session.session_id);
                return (
                  <tr key={id} className="border-b border-cb-border last:border-b-0 hover:bg-cb-hover-overlay">
                    <td className="py-2 pr-3 whitespace-nowrap text-xs text-cb-text-muted">
                      {formatRelative(String(session.started_at))}
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/admin/analytics/sessions/${id}`}
                        className="font-mono text-xs text-cb-terracotta-dark hover:underline"
                      >
                        {id.slice(0, 18)}…
                      </Link>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{String(session.entry_page ?? "—")}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{String(session.exit_page ?? "—")}</td>
                    <td className="py-2 pr-3 capitalize">{String(session.device_type ?? "—")}</td>
                    <td className="py-2 pr-3">{String(session.country ?? "—")}</td>
                    <td className="py-2 pr-3">{String(session.utm_source ?? "direct")}</td>
                    <td className="py-2 pr-3 font-semibold">{String(session.pageview_count ?? 0)}</td>
                  </tr>
                );
              })}
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-sm text-cb-text-muted">
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
