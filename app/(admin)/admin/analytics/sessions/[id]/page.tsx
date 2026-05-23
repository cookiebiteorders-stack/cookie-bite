import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getSessionDetail } from "@/lib/tracking-server/queries";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminAccess("analytics");
  const { id } = await params;
  const detail = await getSessionDetail(id);

  if (!detail) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold text-cb-text-strong">Session not found</h1>
        <Link
          href="/admin/analytics/sessions"
          className="inline-flex rounded-xl bg-cb-surface-2 px-4 py-2 text-sm font-semibold"
        >
          ← Back to sessions
        </Link>
      </div>
    );
  }

  const session = detail.session as Record<string, unknown>;
  const started = new Date(String(session.started_at));
  const ended = session.last_event_at ? new Date(String(session.last_event_at)) : null;
  const durationSec = ended ? Math.round((ended.getTime() - started.getTime()) / 1000) : 0;

  return (
    <div className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <Link
          href="/admin/analytics/sessions"
          className="text-xs font-semibold text-cb-text-muted hover:underline"
        >
          ← Back to sessions
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-cb-text-strong">
          Session {String(session.session_id).slice(0, 24)}…
        </h1>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-cb-text-muted">Visitor</dt>
            <dd className="font-mono text-xs">{String(session.visitor_id)}</dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Duration</dt>
            <dd className="font-semibold">{durationSec}s</dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Device</dt>
            <dd className="capitalize">
              {String(session.device_type ?? "—")} · {String(session.browser ?? "—")} ·{" "}
              {String(session.os ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Entry / Exit</dt>
            <dd className="font-mono text-xs">
              {String(session.entry_page ?? "—")} → {String(session.exit_page ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Source</dt>
            <dd>
              {String(session.utm_source ?? "direct")}
              {session.utm_campaign ? ` · ${String(session.utm_campaign)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Country / IP</dt>
            <dd>
              {String(session.country ?? "—")} · {String(session.ip ?? "—")}
            </dd>
          </div>
        </dl>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="text-base font-semibold text-cb-text-strong">Event timeline</h2>
        <ol className="mt-4 space-y-2 text-sm">
          {detail.events.map((event) => {
            const props = event.properties as Record<string, unknown> | null;
            return (
              <li
                key={event.event_id}
                className="rounded-xl border border-cb-border bg-cb-surface-2 px-3 py-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-cb-terracotta-dark/10 px-2 py-0.5 text-xs font-semibold text-cb-terracotta-dark">
                    {event.name}
                  </span>
                  <span className="text-xs text-cb-text-muted">
                    {new Date(event.occurred_at as string).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs">{String(event.path ?? "—")}</p>
                {props && Object.keys(props).length > 0 ? (
                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/5 p-2 text-[10px] leading-tight text-cb-text">
                    {JSON.stringify(props, null, 2)}
                  </pre>
                ) : null}
              </li>
            );
          })}
          {detail.events.length === 0 ? (
            <li className="text-xs text-cb-text-muted">No events captured.</li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
