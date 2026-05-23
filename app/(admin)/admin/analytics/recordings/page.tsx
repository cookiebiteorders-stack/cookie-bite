import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { listRecordings } from "@/lib/tracking-server/recordings";

export default async function AdminRecordingsPage() {
  await requireAdminAccess("analytics");
  const recordings = await listRecordings(50);

  return (
    <div className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">Session recordings</h1>
        <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">
          Lightweight click-stream replays captured by the SDK when{" "}
          <code>enableReplay</code> is set. Each session shows the mouse path, click
          locations, and page navigations.
        </p>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-3">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-left text-cb-text-muted">
              <tr className="border-b border-cb-border">
                <th className="py-2 pr-3">Started</th>
                <th className="py-2 pr-3">Duration</th>
                <th className="py-2 pr-3">Frames</th>
                <th className="py-2 pr-3">Device</th>
                <th className="py-2 pr-3">Entry / Exit</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => (
                <tr key={r.session_id} className="border-b border-cb-border last:border-b-0">
                  <td className="py-2 pr-3 text-xs text-cb-text-muted">
                    {new Date(r.started_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 font-semibold">{r.duration_seconds}s</td>
                  <td className="py-2 pr-3">{r.frame_count}</td>
                  <td className="py-2 pr-3 capitalize">{r.device_type ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {r.entry_page ?? "—"} → {r.exit_page ?? "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/admin/analytics/recordings/${r.session_id}`}
                      className="rounded-full bg-cb-terracotta-dark px-3 py-1 text-xs font-semibold text-white"
                    >
                      Replay →
                    </Link>
                  </td>
                </tr>
              ))}
              {recordings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-cb-text-muted">
                    No recordings yet. Set <code>enableReplay</code> on the TrackerProvider to start
                    capturing.
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
