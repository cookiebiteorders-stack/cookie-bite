"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { formatDurationSeconds } from "@/lib/admin/realtime-display";
import {
  PresenceActivityTimeline,
  PresenceTimingGrid,
} from "@/components/admin/tracking/presence-timing-ui";

type VisitorPresenceType = "guest" | "customer" | "staff" | "admin" | "owner";

type VisitorRow = {
  visitor_id: string;
  session_id?: string | null;
  path?: string | null;
  device_type?: string | null;
  country?: string | null;
  last_event_name?: string | null;
  visitor_type: VisitorPresenceType;
  display_name: string | null;
  email: string | null;
  session_started_at: string;
  first_seen_at: string | null;
  first_interaction_at: string | null;
  current_page_started_at: string | null;
  last_event_at_iso: string;
  online_seconds: number;
  page_seconds: number;
  recent_events: Array<{ name: string; path: string | null; occurred_at: string }>;
};

type VisitorPresenceResponse = {
  ok: boolean;
  active_users: number;
  guest_count: number;
  customer_count: number;
  visitors: VisitorRow[];
};

function shortVisitorId(visitorId: string): string {
  if (visitorId.length <= 12) return visitorId;
  return `${visitorId.slice(0, 12)}…`;
}

const TYPE_RING: Record<VisitorPresenceType, string> = {
  guest: "ring-slate-300/80",
  customer: "ring-violet-400/80",
  staff: "ring-emerald-400/80",
  admin: "ring-sky-400/80",
  owner: "ring-amber-400/80",
};

const TYPE_BADGE: Record<VisitorPresenceType, string> = {
  guest: "bg-slate-100 text-slate-700",
  customer: "bg-violet-100 text-violet-800",
  staff: "bg-emerald-100 text-emerald-800",
  admin: "bg-sky-100 text-sky-800",
  owner: "bg-amber-100 text-amber-900",
};

function pathLabel(path: string | null | undefined, t: (key: string) => string): string {
  if (!path) return "—";
  const key = `visitorPresence.paths.${path}`;
  const translated = t(key);
  return translated === key ? path : translated;
}

function eventLabel(name: string, t: (key: string) => string): string {
  const key = `presenceTiming.events.${name}`;
  const translated = t(key);
  return translated === key ? name : translated;
}

export function VisitorPresencePanel({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<VisitorPresenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/realtime?window=300", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as VisitorPresenceResponse;
        if (!active) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed");
      }
    };
    void fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  const visitors = data?.visitors ?? [];

  return (
    <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-cb-text-strong">{t("visitorPresence.title")}</h2>
          <p className="mt-1 text-xs text-cb-text-muted">{t("visitorPresence.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-cb-border bg-cb-surface-2 px-3 py-1.5">
            <span aria-hidden className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
            <span className="text-sm font-bold text-cb-text-strong">{data?.active_users ?? "…"}</span>
            <span className="text-xs text-cb-text-muted">{t("visitorPresence.online")}</span>
          </div>
          <div className="rounded-full border border-cb-border bg-cb-surface-2 px-3 py-1.5 text-xs text-cb-text-muted">
            {t("visitorPresence.guests")}:{" "}
            <span className="font-semibold text-cb-text">{data?.guest_count ?? "…"}</span>
          </div>
          <div className="rounded-full border border-cb-border bg-cb-surface-2 px-3 py-1.5 text-xs text-cb-text-muted">
            {t("visitorPresence.customers")}:{" "}
            <span className="font-semibold text-cb-text">{data?.customer_count ?? "…"}</span>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("visitorPresence.error")}: {error}
        </p>
      ) : null}

      {visitors.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-cb-border px-4 py-6 text-center text-sm text-cb-text-muted">
          {t("visitorPresence.empty")}
        </p>
      ) : null}

      <ul className="space-y-3">
        {visitors.map((visitor) => {
          const isGuest = visitor.visitor_type === "guest";
          const displayName = isGuest
            ? t("visitorPresence.anonymous")
            : visitor.display_name?.trim() ||
              visitor.email?.split("@")[0] ||
              t("visitorPresence.unknownUser");
          const pageLabel = pathLabel(visitor.path, t);
          const initial = isGuest ? "?" : displayName.charAt(0).toUpperCase();

          return (
            <li
              key={visitor.visitor_id}
              className="rounded-xl border border-cb-border bg-cb-surface p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cb-surface-2 text-sm font-bold text-cb-text-strong ring-2 ${TYPE_RING[visitor.visitor_type]}`}
                  >
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-cb-text-strong">{displayName}</p>
                    {visitor.email ? (
                      <p className="truncate text-xs text-cb-text-muted">{visitor.email}</p>
                    ) : (
                      <p className="truncate font-mono text-xs text-cb-text-muted">
                        {shortVisitorId(visitor.visitor_id)}
                      </p>
                    )}
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TYPE_BADGE[visitor.visitor_type]}`}
                    >
                      {t(`visitorPresence.types.${visitor.visitor_type}`)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-cb-text-muted">
                  <p>
                    {t("presenceTiming.sessionDuration")}:{" "}
                    <span className="font-semibold text-cb-text">
                      {formatDurationSeconds(visitor.online_seconds, lang)}
                    </span>
                  </p>
                  <p>
                    {t("presenceTiming.onPageDuration")}:{" "}
                    <span className="font-semibold text-cb-text">
                      {formatDurationSeconds(visitor.page_seconds, lang)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-cb-surface-2 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">
                    {t("visitorPresence.viewing")}
                  </p>
                  <p className="mt-0.5 font-medium text-cb-text">{pageLabel}</p>
                  {visitor.path ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-cb-text-muted">
                      {visitor.path}
                    </p>
                  ) : null}
                  {visitor.last_event_name ? (
                    <p className="mt-1 text-[11px] text-cb-text-muted">
                      {t("presenceTiming.lastEvent")}: {eventLabel(visitor.last_event_name, t)}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg bg-cb-surface-2 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">
                    {t("visitorPresence.device")}
                  </p>
                  <p className="mt-0.5 font-medium capitalize text-cb-text">
                    {visitor.device_type ?? "—"}
                  </p>
                  {visitor.country ? (
                    <p className="mt-0.5 text-[11px] text-cb-text-muted">{visitor.country}</p>
                  ) : null}
                </div>
              </div>

              <PresenceTimingGrid
                lang={lang}
                fields={[
                  { label: t("presenceTiming.firstSeen"), at: visitor.first_seen_at },
                  { label: t("presenceTiming.sessionStarted"), at: visitor.session_started_at },
                  { label: t("presenceTiming.firstInteraction"), at: visitor.first_interaction_at },
                  { label: t("presenceTiming.pageStarted"), at: visitor.current_page_started_at },
                  { label: t("presenceTiming.lastActive"), at: visitor.last_event_at_iso },
                ]}
              />

              <PresenceActivityTimeline
                title={t("presenceTiming.activityTimeline")}
                emptyLabel={t("presenceTiming.noActivity")}
                lang={lang}
                items={visitor.recent_events.map((event, idx) => ({
                  key: `${event.occurred_at}-${event.name}-${idx}`,
                  title: eventLabel(event.name, t),
                  subtitle: event.path ? pathLabel(event.path, t) : null,
                  occurred_at: event.occurred_at,
                }))}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
