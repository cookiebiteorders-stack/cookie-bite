import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getHeatmapForPath, getTopPages } from "@/lib/tracking-server/queries";
import { HeatmapGrid } from "@/components/admin/tracking/HeatmapGrid";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";

const DEVICES = ["desktop", "tablet", "mobile"] as const;

export default async function AdminHeatmapPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; device?: string }>;
}) {
  await requireAdminAccess("analytics");
  const params = await searchParams;
  const pages = await getTopPages("30d", 30);
  const activePath = params.path || pages[0]?.path || "/";
  const device = (DEVICES.includes(params.device as (typeof DEVICES)[number])
    ? (params.device as (typeof DEVICES)[number])
    : "desktop") as (typeof DEVICES)[number];
  const cells = await getHeatmapForPath(activePath, device);

  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsHeatmap.title"
        subtitleKey="adminPages.analyticsHeatmap.subtitle"
      />
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {DEVICES.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics/heatmap?path=${encodeURIComponent(activePath)}&device=${d}`}
              className={`rounded-full border px-3 py-1.5 capitalize ${
                d === device
                  ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
                  : "border-cb-border bg-cb-surface-2 text-cb-text-strong hover:bg-cb-hover-overlay"
              }`}
            >
              {d}
            </Link>
          ))}
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-3">
          <p className="px-2 py-1 text-xs font-semibold text-cb-text-muted">Pages</p>
          <ul className="mt-1 space-y-1">
            {pages.map((p) => (
              <li key={p.path}>
                <Link
                  href={`/admin/analytics/heatmap?path=${encodeURIComponent(p.path)}&device=${device}`}
                  className={`block truncate rounded-xl px-2 py-1.5 text-xs font-mono ${
                    p.path === activePath
                      ? "bg-cb-terracotta-dark text-white"
                      : "text-cb-text hover:bg-cb-hover-overlay"
                  }`}
                  title={p.path}
                >
                  {p.path}
                </Link>
              </li>
            ))}
            {pages.length === 0 ? (
              <li className="px-2 py-1 text-xs text-cb-text-muted">No pages yet.</li>
            ) : null}
          </ul>
        </aside>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-base font-semibold text-cb-text-strong">
            <span className="font-mono text-sm">{activePath}</span>
            <span className="ml-3 inline-flex rounded-full bg-cb-surface-2 px-2 py-0.5 text-xs">
              {device}
            </span>
          </h2>
          <div className="mt-4">
            {cells.length > 0 ? (
              <HeatmapGrid cells={cells as never} />
            ) : (
              <p className="py-10 text-center text-sm text-cb-text-muted">
                No clicks recorded yet for this combination. Once visitors interact with the page,
                buckets will appear here.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
