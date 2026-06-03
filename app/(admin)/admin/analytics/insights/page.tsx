import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { generateInsights } from "@/lib/tracking-server/insights";
import type { Range } from "@/lib/tracking-server/queries";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";

const RANGES: Range[] = ["24h", "7d", "30d", "90d"];
const RANGE_LABELS: Record<Range, string> = {
  "24h": "24h",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export default async function AdminInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminAccess("analytics");
  const { range = "7d" } = await searchParams;
  const safe: Range = RANGES.includes(range as Range) ? (range as Range) : "7d";
  const insights = await generateInsights(safe);

  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsInsights.title"
        subtitleKey="adminPages.analyticsInsights.subtitle"
      />
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics/insights?range=${r}`}
              className={`rounded-full border px-3 py-1.5 ${
                r === safe
                  ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
                  : "border-cb-border bg-cb-surface-2 text-cb-text-strong hover:bg-cb-hover-overlay"
              }`}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
          <span className="ml-auto rounded-full bg-cb-surface-2 px-3 py-1.5 text-xs text-cb-text-muted">
            Source: {insights.source}
          </span>
        </div>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <p className="text-base leading-relaxed text-cb-text-strong">{insights.summary}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Highlights
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {insights.highlights.map((bullet, idx) => (
              <li key={idx} className="rounded-xl bg-emerald-50/70 px-3 py-2 text-emerald-900">
                {bullet}
              </li>
            ))}
            {insights.highlights.length === 0 ? (
              <li className="text-xs text-cb-text-muted">No highlights yet.</li>
            ) : null}
          </ul>
        </article>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Warnings
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {insights.warnings.map((bullet, idx) => (
              <li key={idx} className="rounded-xl bg-amber-50/70 px-3 py-2 text-amber-900">
                {bullet}
              </li>
            ))}
            {insights.warnings.length === 0 ? (
              <li className="text-xs text-cb-text-muted">Nothing critical detected.</li>
            ) : null}
          </ul>
        </article>

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-700">
            Recommendations
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {insights.recommendations.map((bullet, idx) => (
              <li key={idx} className="rounded-xl bg-sky-50/70 px-3 py-2 text-sky-900">
                {bullet}
              </li>
            ))}
            {insights.recommendations.length === 0 ? (
              <li className="text-xs text-cb-text-muted">No actions for now.</li>
            ) : null}
          </ul>
        </article>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;
