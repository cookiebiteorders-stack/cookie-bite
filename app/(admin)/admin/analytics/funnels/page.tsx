import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { computeFunnel, listFunnels } from "@/lib/tracking-server/funnels";
import type { Range } from "@/lib/tracking-server/queries";
import { FunnelChart } from "@/components/admin/tracking/FunnelChart";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";

const RANGE_LABELS: Record<Range, string> = {
  "24h": "24h",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export default async function AdminFunnelsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; slug?: string }>;
}) {
  await requireAdminAccess("analytics");
  const params = await searchParams;
  const range: Range = (["24h", "7d", "30d", "90d"] as Range[]).includes(params.range as Range)
    ? (params.range as Range)
    : "30d";

  const funnels = await listFunnels();
  const activeSlug = params.slug && funnels.some((f) => f.slug === params.slug)
    ? params.slug
    : funnels[0]?.slug;
  const computation = activeSlug ? await computeFunnel(activeSlug, range) : null;

  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsFunnels.title"
        subtitleKey="adminPages.analyticsFunnels.subtitle"
      />
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <Link
              key={r}
              href={`/admin/analytics/funnels?slug=${activeSlug ?? ""}&range=${r}`}
              className={`rounded-full border px-3 py-1.5 ${
                r === range
                  ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
                  : "border-cb-border bg-cb-surface-2 text-cb-text-strong hover:bg-cb-hover-overlay"
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </div>
      </header>

      {funnels.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cb-border bg-cb-surface-2 p-6 text-sm text-cb-text-muted">
          No funnels yet. The migration ships with <code>ecommerce_default</code> — add more by
          inserting rows in <code>tracking_funnels</code>.
        </p>
      ) : (
        <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-3">
            <ul className="space-y-1">
              {funnels.map((funnel) => (
                <li key={funnel.id}>
                  <Link
                    href={`/admin/analytics/funnels?slug=${funnel.slug}&range=${range}`}
                    className={`block rounded-xl px-3 py-2 text-sm ${
                      funnel.slug === activeSlug
                        ? "bg-cb-terracotta-dark text-white"
                        : "text-cb-text hover:bg-cb-hover-overlay"
                    }`}
                  >
                    <p className="font-semibold">{funnel.name}</p>
                    <p
                      className={`text-xs ${
                        funnel.slug === activeSlug
                          ? "text-white/80"
                          : "text-cb-text-muted"
                      }`}
                    >
                      {funnel.steps.length} steps
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
            {computation ? (
              <>
                <h2 className="text-lg font-semibold text-cb-text-strong">
                  {computation.funnel.name}
                </h2>
                <p className="text-xs text-cb-text-muted">
                  {computation.total_visitors.toLocaleString()} visitors entered this funnel.
                </p>
                <div className="mt-4">
                  <FunnelChart steps={computation.steps} />
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-cb-border text-left text-cb-text-muted">
                      <th className="py-2 pr-4">Step</th>
                      <th className="py-2 pr-4">Event</th>
                      <th className="py-2 pr-4">Visitors</th>
                      <th className="py-2 pr-4">Conversion</th>
                      <th className="py-2 pr-4">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computation.steps.map((step) => (
                      <tr key={step.index} className="border-b border-cb-border last:border-b-0">
                        <td className="py-2 pr-4 font-semibold">{step.name}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{step.event}</td>
                        <td className="py-2 pr-4">{step.visitors.toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          {(step.conversion_pct * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 pr-4">
                          {(step.drop_off_pct * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-sm text-cb-text-muted">Select a funnel to compute it.</p>
            )}
          </article>
        </section>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
