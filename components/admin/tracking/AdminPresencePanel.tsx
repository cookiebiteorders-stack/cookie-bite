"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { formatDurationSeconds } from "@/lib/admin/realtime-display";
import {
  PresenceActivityTimeline,
  PresenceTimingGrid,
} from "@/components/admin/tracking/presence-timing-ui";

type PresenceStaff = {
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  role: "owner" | "admin" | "staff";
  current_path: string | null;
  current_page_key: string | null;
  last_action: string | null;
  device_label: string | null;
  ip: string | null;
  last_seen_at: string;
  session_started_at: string;
  first_interaction_at: string | null;
  current_page_started_at: string | null;
  online_seconds: number;
  page_seconds: number;
  recent_actions: Array<{ action: string; module: string; created_at: string }>;
};

type PresenceResponse = {
  ok: boolean;
  online_count: number;
  staff: PresenceStaff[];
};

const ROLE_RING: Record<PresenceStaff["role"], string> = {
  owner: "ring-amber-400/80",
  admin: "ring-sky-400/80",
  staff: "ring-emerald-400/80",
};

export function AdminPresencePanel({ intervalMs = 12_000 }: { intervalMs?: number }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState<PresenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/admin/presence?window=300", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PresenceResponse;
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

  const staff = data?.staff ?? [];

  return (
    <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-cb-text-strong">{t("adminPresence.title")}</h2>
          <p className="mt-1 text-xs text-cb-text-muted">{t("adminPresence.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cb-border bg-cb-surface-2 px-3 py-1.5">
          <span aria-hidden className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-sm font-bold text-cb-text-strong">{data?.online_count ?? "…"}</span>
          <span className="text-xs text-cb-text-muted">{t("adminPresence.online")}</span>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {t("adminPresence.error")}: {error}
        </p>
      ) : null}

      {staff.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-cb-border px-4 py-6 text-center text-sm text-cb-text-muted">
          {t("adminPresence.empty")}
        </p>
      ) : null}

      <ul className="space-y-3">
        {staff.map((member) => {
          const displayName =
            member.full_name?.trim() ||
            member.email?.split("@")[0] ||
            t("adminPresence.unknownUser");
          const pageLabel = member.current_page_key
            ? t(`adminNav.${member.current_page_key}`)
            : member.current_path ?? "—";

          return (
            <li
              key={member.clerk_user_id}
              className="rounded-xl border border-cb-border bg-cb-surface p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cb-peach/60 text-sm font-bold text-cb-text-strong ring-2 ${ROLE_RING[member.role]}`}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-cb-text-strong">{displayName}</p>
                    <p className="truncate text-xs text-cb-text-muted">{member.email ?? "—"}</p>
                    <span className="mt-1 inline-flex rounded-full border border-cb-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cb-text">
                      {t(`adminRoles.${member.role}`)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-cb-text-muted">
                  <p>
                    {t("presenceTiming.sessionDuration")}:{" "}
                    <span className="font-semibold text-cb-text">
                      {formatDurationSeconds(member.online_seconds, lang)}
                    </span>
                  </p>
                  <p>
                    {t("presenceTiming.onPageDuration")}:{" "}
                    <span className="font-semibold text-cb-text">
                      {formatDurationSeconds(member.page_seconds, lang)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-cb-surface-2 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">
                    {t("adminPresence.viewing")}
                  </p>
                  <p className="mt-0.5 font-medium text-cb-text">{pageLabel}</p>
                  {member.current_path ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-cb-text-muted">
                      {member.current_path}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg bg-cb-surface-2 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">
                    {t("adminPresence.device")}
                  </p>
                  <p className="mt-0.5 font-medium text-cb-text">{member.device_label ?? "—"}</p>
                  {member.ip ? (
                    <p className="mt-0.5 font-mono text-[11px] text-cb-text-muted">{member.ip}</p>
                  ) : null}
                </div>
              </div>

              <PresenceTimingGrid
                lang={lang}
                fields={[
                  { label: t("presenceTiming.sessionStarted"), at: member.session_started_at },
                  { label: t("presenceTiming.firstInteraction"), at: member.first_interaction_at },
                  { label: t("presenceTiming.pageStarted"), at: member.current_page_started_at },
                  { label: t("presenceTiming.lastActive"), at: member.last_seen_at },
                ]}
              />

              <PresenceActivityTimeline
                title={t("presenceTiming.activityTimeline")}
                emptyLabel={t("presenceTiming.noActivity")}
                lang={lang}
                items={member.recent_actions.map((action, idx) => ({
                  key: `${action.created_at}-${idx}`,
                  title: action.action,
                  subtitle: action.module,
                  occurred_at: action.created_at,
                }))}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
