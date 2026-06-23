"use client";

import Link from "next/link";
import { useLanguage } from "@/components/providers/language-provider";
import type { EnrichedSessionRow } from "@/lib/tracking-server/session-enrich";
import {
  formatTrackingDateTime,
  formatTrackingDuration,
} from "@/lib/tracking-server/session-detail";
import type { VisitorPresenceType } from "@/lib/tracking-server/visitor-identity";
import { cn } from "@/lib/utils";

type Props = {
  sessions: EnrichedSessionRow[];
};

function formatRelative(iso: string, t: (key: string, params?: Record<string, string>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return t("analyticsSessions.relativeSeconds", { n: String(Math.round(diff / 1000)) });
  if (diff < 3_600_000) return t("analyticsSessions.relativeMinutes", { n: String(Math.round(diff / 60_000)) });
  if (diff < 86_400_000) return t("analyticsSessions.relativeHours", { n: String(Math.round(diff / 3_600_000)) });
  return t("analyticsSessions.relativeDays", { n: String(Math.round(diff / 86_400_000)) });
}

function durationForRow(session: EnrichedSessionRow): number {
  if (session.duration_seconds != null) return Number(session.duration_seconds);
  const started = new Date(String(session.started_at)).getTime();
  const ended = new Date(String(session.last_event_at ?? session.started_at)).getTime();
  return Math.max(0, Math.round((ended - started) / 1000));
}

const TYPE_BADGE: Record<VisitorPresenceType, string> = {
  guest: "bg-slate-100 text-slate-700",
  customer: "bg-violet-100 text-violet-800",
  staff: "bg-emerald-100 text-emerald-800",
  admin: "bg-sky-100 text-sky-800",
  owner: "bg-amber-100 text-amber-900",
};

export function SessionsListTable({ sessions }: Props) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-3">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full text-sm">
          <thead className="text-start text-cb-text-muted">
            <tr className="border-b border-cb-border">
              <th className="py-2 pe-3">{t("analyticsSessions.colStarted")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colVisitor")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colType")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colDuration")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colPageTime")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colIp")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colDevice")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colLocation")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colEntry")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colSource")}</th>
              <th className="py-2 pe-3">{t("analyticsSessions.colPvs")}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const id = String(session.session_id);
              const startedAt = String(session.started_at);
              const type = session.identity.visitor_type;
              return (
                <tr
                  key={id}
                  className="border-b border-cb-border last:border-b-0 hover:bg-cb-hover-overlay"
                >
                  <td className="py-2 pe-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-cb-text-strong">
                      {formatTrackingDateTime(startedAt)}
                    </div>
                    <div className="text-[10px] text-cb-text-muted">{formatRelative(startedAt, t)}</div>
                  </td>
                  <td className="py-2 pe-3 max-w-[220px]">
                    <Link
                      href={`/admin/analytics/sessions/${encodeURIComponent(id)}`}
                      className="block hover:underline"
                    >
                      <span className="font-semibold text-cb-text-strong line-clamp-2">
                        {session.identity.session_label}
                      </span>
                      <span className="font-mono text-[10px] text-cb-text-muted">{id.slice(0, 14)}…</span>
                    </Link>
                    {session.identity.email && session.identity.display_name ? (
                      <p className="mt-0.5 truncate text-[10px] text-cb-text-muted">
                        {session.identity.email}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 pe-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        TYPE_BADGE[type],
                      )}
                    >
                      {t(`visitorPresence.types.${type}`)}
                    </span>
                  </td>
                  <td className="py-2 pe-3 whitespace-nowrap font-semibold">
                    {formatTrackingDuration(durationForRow(session))}
                  </td>
                  <td className="py-2 pe-3 max-w-[280px]">
                    <p className="line-clamp-3 font-mono text-[10px] leading-relaxed text-cb-text">
                      {session.page_time_label}
                    </p>
                  </td>
                  <td className="py-2 pe-3 font-mono text-xs">{String(session.ip ?? "—")}</td>
                  <td className="py-2 pe-3 capitalize whitespace-nowrap">
                    {String(session.device_type ?? "—")}
                    {session.browser ? ` · ${String(session.browser)}` : ""}
                  </td>
                  <td className="py-2 pe-3 whitespace-nowrap">
                    {String(session.country ?? "—")}
                    {session.city ? ` · ${String(session.city)}` : ""}
                  </td>
                  <td
                    className="py-2 pe-3 max-w-[120px] truncate font-mono text-xs"
                    title={String(session.entry_page ?? "")}
                  >
                    {String(session.entry_page ?? "—")}
                  </td>
                  <td className="py-2 pe-3">{String(session.utm_source ?? "direct")}</td>
                  <td className="py-2 pe-3 font-semibold">{String(session.pageview_count ?? 0)}</td>
                </tr>
              );
            })}
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-4 text-center text-sm text-cb-text-muted">
                  {t("analyticsSessions.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
