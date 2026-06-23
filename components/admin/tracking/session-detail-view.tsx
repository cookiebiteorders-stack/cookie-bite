"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Clock,
  Globe,
  Laptop,
  MapPin,
  MousePointerClick,
  Play,
  ScrollText,
  ShoppingCart,
  Smartphone,
  Tablet,
} from "lucide-react";
import type { SessionDetailPayload } from "@/lib/tracking-server/session-detail";
import {
  formatTrackingDateTime,
  formatTrackingDuration,
} from "@/lib/tracking-server/session-detail";
import type { VisitorPresenceType } from "@/lib/tracking-server/visitor-identity";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  detail: SessionDetailPayload;
};

function DeviceIcon({ type }: { type: string | null | undefined }) {
  const t = (type ?? "").toLowerCase();
  if (t === "mobile") return <Smartphone className="h-4 w-4" aria-hidden />;
  if (t === "tablet") return <Tablet className="h-4 w-4" aria-hidden />;
  return <Laptop className="h-4 w-4" aria-hidden />;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3">
      <p className="text-xs text-cb-text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-cb-text-strong">{value}</p>
    </div>
  );
}

function kindBadge(kind: string) {
  const map: Record<string, string> = {
    page: "bg-emerald-500/10 text-emerald-800",
    click: "bg-sky-500/10 text-sky-800",
    event: "bg-violet-500/10 text-violet-800",
    conversion: "bg-amber-500/10 text-amber-900",
    scroll: "bg-neutral-500/10 text-neutral-700",
  };
  return map[kind] ?? "bg-cb-surface-2 text-cb-text";
}

const TYPE_BADGE: Record<VisitorPresenceType, string> = {
  guest: "bg-slate-100 text-slate-700",
  customer: "bg-violet-100 text-violet-800",
  staff: "bg-emerald-100 text-emerald-800",
  admin: "bg-sky-100 text-sky-800",
  owner: "bg-amber-100 text-amber-900",
};

export function SessionDetailView({ detail }: Props) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"pages" | "timeline">("pages");
  const session = detail.session;
  const sessionId = String(session.session_id);
  const identity = detail.identity;

  const utmParts = [
    session.utm_source,
    session.utm_medium,
    session.utm_campaign,
    session.utm_term,
    session.utm_content,
  ].filter(Boolean);

  const screenLabel = useMemo(() => {
    const w = detail.visitor?.screen_width;
    const h = detail.visitor?.screen_height;
    if (!w || !h) return "—";
    return `${w}×${h}`;
  }, [detail.visitor?.screen_height, detail.visitor?.screen_width]);

  return (
    <div className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <Link
          href="/admin/analytics/sessions"
          className="text-xs font-semibold text-cb-text-muted hover:underline"
        >
          {t("analyticsSessions.backToList")}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-cb-text-strong">
                {identity.session_label}
              </h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  TYPE_BADGE[identity.visitor_type],
                )}
              >
                {t(`visitorPresence.types.${identity.visitor_type}`)}
              </span>
            </div>
            <p className="mt-1 text-sm text-cb-text-muted">{t("analyticsSessions.sessionTitle")}</p>
            <p className="mt-1 font-mono text-xs text-cb-text-muted">{sessionId}</p>
            {identity.email ? (
              <p className="mt-1 text-sm text-cb-text">{identity.email}</p>
            ) : null}
            <p className="mt-2 text-sm text-cb-text">
              {t("analyticsSessions.started")}{" "}
              <strong>{formatTrackingDateTime(String(session.started_at))}</strong>
              {session.last_event_at ? (
                <>
                  {" "}
                  · {t("analyticsSessions.lastActivity")}{" "}
                  <strong>{formatTrackingDateTime(String(session.last_event_at))}</strong>
                </>
              ) : null}
            </p>
          </div>
          {detail.has_recording ? (
            <Link
              href={`/admin/analytics/recordings/${encodeURIComponent(sessionId)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Play className="h-4 w-4" aria-hidden />
              {t("analyticsSessions.watchReplay")}
            </Link>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard
            label={t("presenceTiming.sessionDuration")}
            value={formatTrackingDuration(detail.stats.duration_seconds)}
          />
          <StatCard label={t("analyticsSessions.colPvs")} value={detail.stats.page_views} />
          <StatCard label={t("analyticsSessions.clicksHeading")} value={detail.stats.clicks} />
          <StatCard label={t("analyticsSessions.actionsHeading")} value={detail.stats.custom_events} />
          <StatCard label={t("presenceTiming.events.scroll")} value={detail.stats.scroll_events} />
          <StatCard label={t("analyticsSessions.conversions")} value={detail.stats.conversions} />
          <StatCard label={t("presenceTiming.events.rage_click")} value={detail.stats.rage_clicks} />
        </div>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="text-base font-semibold text-cb-text-strong">
          {t("analyticsSessions.identityTitle")}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-cb-text-muted">{t("analyticsSessions.colType")}</dt>
            <dd>{t(`visitorPresence.types.${identity.visitor_type}`)}</dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">{t("analyticsSessions.colVisitor")}</dt>
            <dd className="font-semibold">{identity.session_label}</dd>
          </div>
          {identity.email ? (
            <div>
              <dt className="text-xs text-cb-text-muted">{t("analyticsSessions.email")}</dt>
              <dd>{identity.email}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-cb-text-muted">{t("analyticsSessions.visitorId")}</dt>
            <dd className="font-mono text-xs break-all">{String(session.visitor_id)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-cb-text-strong">Device & browser</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <DeviceIcon type={String(session.device_type ?? detail.visitor?.browser)} />
              <div>
                <dt className="text-xs text-cb-text-muted">Device</dt>
                <dd className="capitalize font-medium">
                  {String(session.device_type ?? "—")} · {String(session.browser ?? detail.visitor?.browser ?? "—")}
                  {detail.visitor?.browser_version ? ` ${detail.visitor.browser_version}` : ""}
                </dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-cb-text-muted">OS</dt>
              <dd>
                {String(session.os ?? detail.visitor?.os ?? "—")}
                {detail.visitor?.os_version ? ` ${detail.visitor.os_version}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-cb-text-muted">Screen</dt>
              <dd>{screenLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-cb-text-muted">Language / timezone</dt>
              <dd>
                {detail.visitor?.language ?? "—"} · {detail.visitor?.timezone ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="text-base font-semibold text-cb-text-strong">Location & network</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-cb-text-muted" aria-hidden />
              <div>
                <dt className="text-xs text-cb-text-muted">Country / city</dt>
                <dd>
                  {String(session.country ?? detail.visitor?.country ?? "—")}
                  {session.city || detail.visitor?.city
                    ? ` · ${String(session.city ?? detail.visitor?.city)}`
                    : ""}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 h-4 w-4 text-cb-text-muted" aria-hidden />
              <div>
                <dt className="text-xs text-cb-text-muted">IP address</dt>
                <dd className="font-mono text-xs">{String(session.ip ?? "—")}</dd>
              </div>
            </div>
            <div>
              <dt className="text-xs text-cb-text-muted">Visitor ID</dt>
              <dd className="font-mono text-xs break-all">{String(session.visitor_id)}</dd>
            </div>
            {detail.visitor?.user_id ? (
              <div>
                <dt className="text-xs text-cb-text-muted">Logged-in user</dt>
                <dd className="font-mono text-xs break-all">{detail.visitor.user_id}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="text-base font-semibold text-cb-text-strong">Acquisition</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-cb-text-muted">Referrer</dt>
            <dd className="break-all font-mono text-xs">{String(session.referrer ?? "direct")}</dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">UTM</dt>
            <dd>{utmParts.length ? utmParts.join(" · ") : "direct / none"}</dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Entry → exit</dt>
            <dd className="font-mono text-xs">
              {String(session.entry_page ?? "—")} → {String(session.exit_page ?? "—")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-cb-text-muted">Bounce</dt>
            <dd>{detail.stats.is_bounce ? "Yes" : "No"}</dd>
          </div>
          {detail.visitor ? (
            <>
              <div>
                <dt className="text-xs text-cb-text-muted">Visitor first seen</dt>
                <dd>{detail.visitor.first_seen_at ? formatTrackingDateTime(detail.visitor.first_seen_at) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-cb-text-muted">Lifetime sessions</dt>
                <dd>{detail.visitor.total_sessions ?? "—"}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </section>

      {detail.conversions.length > 0 ? (
        <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-cb-text-strong">
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Conversions
          </h2>
          <ul className="mt-4 space-y-2">
            {detail.conversions.map((c) => (
              <li
                key={`${c.goal}-${c.occurred_at}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cb-border bg-cb-surface-2 px-3 py-2 text-sm"
              >
                <span className="font-semibold">{c.goal}</span>
                <span className="text-cb-text-muted">{formatTrackingDateTime(c.occurred_at)}</span>
                {c.value != null ? (
                  <span className="font-mono text-xs">
                    {c.value} {c.currency ?? ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-cb-text-strong">Activity</h2>
          <div className="flex gap-1 rounded-lg border border-cb-border p-1">
            {(["pages", "timeline"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
                  tab === key
                    ? "bg-cb-terracotta-dark text-white"
                    : "text-cb-text-muted hover:bg-cb-hover-overlay",
                )}
              >
                {key === "pages" ? "By page" : "Full timeline"}
              </button>
            ))}
          </div>
        </div>

        {tab === "pages" ? (
          <ol className="mt-5 space-y-4">
            {detail.pages.map((page) => (
              <li
                key={`${page.path}-${page.entered_at}`}
                className="rounded-2xl border border-cb-border bg-cb-surface-2 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-cb-terracotta-dark">
                      {t("analyticsSessions.pageN", { n: String(page.index) })}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-cb-text-strong">{page.path}</p>
                    {page.title ? <p className="mt-1 text-sm text-cb-text">{page.title}</p> : null}
                  </div>
                  <div className="text-end text-xs text-cb-text-muted">
                    <p>{formatTrackingDateTime(page.entered_at)}</p>
                    <p className="mt-1 flex items-center justify-end gap-1 font-semibold text-cb-text-strong">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatTrackingDuration(page.duration_seconds)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {page.max_scroll_pct != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/10 px-2 py-0.5">
                      <ScrollText className="h-3 w-3" aria-hidden />
                      {t("analyticsSessions.scrollPct", { pct: String(page.max_scroll_pct) })}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5">
                    <MousePointerClick className="h-3 w-3" aria-hidden />
                    {t("analyticsSessions.clicksCount", { n: String(page.clicks.length) })}
                  </span>
                  <span className="rounded-full bg-violet-500/10 px-2 py-0.5">
                    {t("analyticsSessions.actionsCount", { n: String(page.actions.length) })}
                  </span>
                </div>

                {page.clicks.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">Clicks</p>
                    <ul className="mt-2 space-y-1.5">
                      {page.clicks.map((click) => (
                        <li
                          key={`${click.occurred_at}-${click.element_text}`}
                          className="rounded-lg border border-cb-border/70 bg-cb-surface px-2.5 py-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={cn(click.is_rage && "text-red-700 font-semibold")}>
                              {[click.element_tag, click.element_text].filter(Boolean).join(" · ") || "Click"}
                              {click.is_rage ? " · rage" : ""}
                            </span>
                            <span className="text-cb-text-muted">{formatTrackingDateTime(click.occurred_at)}</span>
                          </div>
                          {click.href ? (
                            <p className="mt-1 truncate font-mono text-[10px] text-cb-text-muted">{click.href}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {page.actions.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">Actions</p>
                    <ul className="mt-2 space-y-1.5">
                      {page.actions.map((action) => (
                        <li
                          key={`${action.occurred_at}-${action.name}-${action.label}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cb-border/70 bg-cb-surface px-2.5 py-2 text-xs"
                        >
                          <span>
                            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 font-semibold text-violet-800">
                              {action.name}
                            </span>{" "}
                            {action.label}
                          </span>
                          <span className="text-cb-text-muted">{formatTrackingDateTime(action.occurred_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
            {detail.pages.length === 0 ? (
              <li className="text-sm text-cb-text-muted">{t("analyticsSessions.noPages")}</li>
            ) : null}
          </ol>
        ) : (
          <ol className="mt-5 space-y-2">
            {detail.timeline.map((entry, idx) => (
              <li
                key={`${entry.occurred_at}-${entry.kind}-${idx}`}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-cb-border bg-cb-surface-2 px-3 py-2 text-sm"
              >
                <span className="whitespace-nowrap text-xs text-cb-text-muted">
                  {formatTrackingDateTime(entry.occurred_at)}
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", kindBadge(entry.kind))}>
                  {entry.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-cb-text-strong">{entry.summary}</p>
                  {entry.path ? <p className="font-mono text-xs text-cb-text-muted">{entry.path}</p> : null}
                </div>
              </li>
            ))}
            {detail.timeline.length === 0 ? (
              <li className="text-sm text-cb-text-muted">{t("analyticsSessions.noTimeline")}</li>
            ) : null}
          </ol>
        )}
      </section>
    </div>
  );
}
