import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getDevicesBreakdown, getOverview, getReferrersBreakdown, getTopPages } from "@/lib/tracking-server/queries";
import type { Range } from "@/lib/tracking-server/queries";
import { KpiCard } from "@/components/admin/tracking/KpiCard";
import { TimelineChart } from "@/components/admin/tracking/TimelineChart";
import { DeviceDonut } from "@/components/admin/tracking/DeviceDonut";

const RANGE_LABELS: Record<Range, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function formatPct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export default async function AdminAnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminAccess("analytics");
  const { range = "7d" } = await searchParams;
  const validRanges: Range[] = ["24h", "7d", "30d", "90d"];
  const safeRange: Range = validRanges.includes(range as Range) ? (range as Range) : "7d";

  const [overview, pages, devices, referrers] = await Promise.all([
    getOverview(safeRange),
    getTopPages(safeRange, 10),
    getDevicesBreakdown(safeRange),
    getReferrersBreakdown(safeRange),
  ]);

  return (
    <div className="space-y-6">
      <section className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
              Analytics overview
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">
              First-party tracking dashboard: visitors, sessions, conversions, devices, sources, and
              session timelines, served straight from your own database.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <Link
                key={r}
                href={`/admin/analytics?range=${r}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  r === safeRange
                    ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
                    : "border-cb-border bg-cb-surface-2 text-cb-text-strong hover:bg-cb-hover-overlay"
                }`}
              >
                {RANGE_LABELS[r]}
              </Link>
            ))}
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { href: "/admin/analytics/realtime", label: "Realtime" },
            { href: "/admin/analytics/funnels", label: "Funnels" },
            { href: "/admin/analytics/heatmap", label: "Heatmaps" },
            { href: "/admin/analytics/sessions", label: "Sessions" },
            { href: "/admin/analytics/recordings", label: "Recordings" },
            { href: "/admin/analytics/insights", label: "AI Insights" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-cb-border bg-cb-surface-2 px-3 py-1.5 text-cb-text-strong hover:bg-cb-hover-overlay"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Visitors" value={overview.visitors.toLocaleString()} tone="info" hint={RANGE_LABELS[safeRange]} />
        <KpiCard label="Sessions" value={overview.sessions.toLocaleString()} tone="success" hint={RANGE_LABELS[safeRange]} />
        <KpiCard label="Page views" value={overview.page_views.toLocaleString()} tone="info" />
        <KpiCard label="Events" value={overview.events.toLocaleString()} />
        <KpiCard
          label="Avg session"
          value={formatDuration(overview.avg_duration_seconds)}
          tone="success"
        />
        <KpiCard
          label="Bounce rate"
          value={formatPct(overview.bounce_rate)}
          tone={overview.bounce_rate > 0.6 ? "warning" : "success"}
        />
        <KpiCard
          label="Conversions"
          value={overview.conversions.toLocaleString()}
          tone="success"
        />
        <KpiCard
          label="Conversion rate"
          value={formatPct(overview.conversion_rate)}
          tone={overview.conversion_rate < 0.01 ? "warning" : "success"}
        />
      </section>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="text-base font-semibold text-cb-text-strong">Traffic over time</h2>
        <p className="text-xs text-cb-text-muted">Visitors and page views grouped by time bucket.</p>
        <div className="mt-3">
          {overview.timeline.length > 0 ? (
            <TimelineChart data={overview.timeline} />
          ) : (
            <p className="py-10 text-center text-sm text-cb-text-muted">
              No data yet for this range — events will appear as soon as the SDK fires.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-base font-semibold text-cb-text-strong">Top pages</h2>
          <div className="admin-table-scroll mt-3">
            <table className="min-w-[480px] w-full text-sm">
              <thead className="text-left text-cb-text-muted">
                <tr className="border-b border-cb-border">
                  <th className="py-2 pr-4">Path</th>
                  <th className="py-2 pr-4">Views</th>
                  <th className="py-2 pr-4">Unique visitors</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((row) => (
                  <tr key={row.path} className="border-b border-cb-border last:border-b-0">
                    <td className="py-2 pr-4 font-mono text-xs text-cb-text">{row.path}</td>
                    <td className="py-2 pr-4 font-semibold">{row.views.toLocaleString()}</td>
                    <td className="py-2 pr-4">{row.unique_visitors.toLocaleString()}</td>
                  </tr>
                ))}
                {pages.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-cb-text-muted">
                      No data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-base font-semibold text-cb-text-strong">Sources</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {referrers.slice(0, 10).map((row) => (
              <li
                key={row.source}
                className="flex items-center justify-between border-b border-cb-border py-1.5 last:border-b-0"
              >
                <span className="truncate text-cb-text">{row.source}</span>
                <span className="rounded-full bg-cb-surface-2 px-2 py-0.5 text-xs font-semibold">
                  {row.sessions}
                </span>
              </li>
            ))}
            {referrers.length === 0 ? (
              <li className="text-xs text-cb-text-muted">No referrers yet.</li>
            ) : null}
          </ul>
        </article>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <DeviceDonut data={devices.devices} title="Device types" />
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <DeviceDonut data={devices.browsers} title="Browsers" />
        </article>
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <DeviceDonut data={devices.oses} title="Operating systems" />
        </article>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
