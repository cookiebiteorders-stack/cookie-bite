import type { SupabaseClient } from "@supabase/supabase-js";
import { formatTrackingDuration } from "@/lib/tracking-server/session-detail";
import {
  buildGuestSessionLabel,
  loadUsersByDbIds,
  resolveIdentityFromUser,
  type ResolvedVisitorIdentity,
  type VisitorPresenceType,
} from "@/lib/tracking-server/visitor-identity";

export type SessionPageSummary = {
  path: string;
  title: string | null;
  duration_seconds: number;
};

export type EnrichedSessionRow = Record<string, unknown> & {
  identity: ResolvedVisitorIdentity;
  page_summaries: SessionPageSummary[];
  page_time_label: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function computePageSummaries(input: {
  pageViews: Array<Record<string, unknown>>;
  timeOnPageEvents: Array<Record<string, unknown>>;
  sessionEnd: string;
}): SessionPageSummary[] {
  const sortedPvs = [...input.pageViews].sort((a, b) =>
    String(a.occurred_at).localeCompare(String(b.occurred_at)),
  );

  return sortedPvs.map((pv, index) => {
    const enteredAt = String(pv.occurred_at);
    const nextEnter = sortedPvs[index + 1]?.occurred_at;
    const leftAt = nextEnter ? String(nextEnter) : input.sessionEnd;
    const path = String(pv.path ?? "/");

    const inRange = (occurredAt: string) => occurredAt >= enteredAt && occurredAt < leftAt;

    const finals = input.timeOnPageEvents
      .filter(
        (e) =>
          String(e.path ?? "") === path &&
          inRange(String(e.occurred_at)) &&
          asRecord(e.properties).final === true,
      )
      .map((e) => Number(asRecord(e.properties).seconds ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);

    const anyTimes = input.timeOnPageEvents
      .filter((e) => String(e.path ?? "") === path && inRange(String(e.occurred_at)))
      .map((e) => Number(asRecord(e.properties).seconds ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);

    const fromEvents = finals.length
      ? finals[finals.length - 1]
      : anyTimes.length
        ? Math.max(...anyTimes)
        : 0;

    const fromSpan = Math.max(
      0,
      Math.round((new Date(leftAt).getTime() - new Date(enteredAt).getTime()) / 1000),
    );

    const stored = pv.duration_seconds != null ? Number(pv.duration_seconds) : 0;

    return {
      path,
      title: (pv.title as string | null) ?? null,
      duration_seconds: fromEvents || stored || fromSpan,
    };
  });
}

export async function loadSessionPageSummaries(
  supabase: SupabaseClient,
  sessions: Array<Record<string, unknown>>,
): Promise<Map<string, SessionPageSummary[]>> {
  const result = new Map<string, SessionPageSummary[]>();
  const sessionIds = sessions.map((s) => String(s.session_id)).filter(Boolean);
  if (sessionIds.length === 0) return result;

  const sessionEndById = new Map(
    sessions.map((s) => [
      String(s.session_id),
      String(s.last_event_at ?? s.started_at ?? new Date().toISOString()),
    ]),
  );

  const [pageViewsRes, eventsRes] = await Promise.all([
    supabase
      .from("tracking_page_views")
      .select("session_id, path, title, occurred_at, duration_seconds")
      .in("session_id", sessionIds)
      .order("occurred_at", { ascending: true })
      .limit(5000),
    supabase
      .from("tracking_events")
      .select("session_id, name, path, occurred_at, properties")
      .in("session_id", sessionIds)
      .eq("name", "time_on_page")
      .order("occurred_at", { ascending: true })
      .limit(5000),
  ]);

  const pvsBySession = new Map<string, Array<Record<string, unknown>>>();
  for (const row of pageViewsRes.data ?? []) {
    const sid = String(row.session_id);
    const list = pvsBySession.get(sid) ?? [];
    list.push(row as Record<string, unknown>);
    pvsBySession.set(sid, list);
  }

  const eventsBySession = new Map<string, Array<Record<string, unknown>>>();
  for (const row of eventsRes.data ?? []) {
    const sid = String(row.session_id);
    const list = eventsBySession.get(sid) ?? [];
    list.push(row as Record<string, unknown>);
    eventsBySession.set(sid, list);
  }

  for (const sessionId of sessionIds) {
    result.set(
      sessionId,
      computePageSummaries({
        pageViews: pvsBySession.get(sessionId) ?? [],
        timeOnPageEvents: eventsBySession.get(sessionId) ?? [],
        sessionEnd: sessionEndById.get(sessionId) ?? new Date().toISOString(),
      }),
    );
  }

  return result;
}

export function formatPageSummariesLabel(summaries: SessionPageSummary[]): string {
  if (summaries.length === 0) return "—";
  return summaries
    .map((page) => `${page.path} ${formatTrackingDuration(page.duration_seconds)}`)
    .join(" · ");
}

export async function enrichSessionRows(
  supabase: SupabaseClient,
  rows: Array<Record<string, unknown>>,
): Promise<EnrichedSessionRow[]> {
  if (rows.length === 0) return [];

  const dbUserIds = rows
    .map((row) => (row.user_id ? String(row.user_id) : null))
    .filter((id): id is string => Boolean(id));

  const [usersByDb, pageSummaries] = await Promise.all([
    loadUsersByDbIds(supabase, dbUserIds),
    loadSessionPageSummaries(supabase, rows),
  ]);

  return rows.map((row) => {
    const sessionId = String(row.session_id);
    const guestFallback = buildGuestSessionLabel({
      visitor_id: row.visitor_id as string,
      device_type: row.device_type as string,
      browser: row.browser as string,
      city: row.city as string,
      country: row.country as string,
    });

    const dbUserId = row.user_id ? String(row.user_id) : null;
    const user = dbUserId ? usersByDb.get(dbUserId) : undefined;
    const identity = resolveIdentityFromUser(user, guestFallback);
    const summaries = pageSummaries.get(sessionId) ?? [];

    return {
      ...row,
      identity,
      page_summaries: summaries,
      page_time_label: formatPageSummariesLabel(summaries),
    };
  });
}

export type { VisitorPresenceType, ResolvedVisitorIdentity };
