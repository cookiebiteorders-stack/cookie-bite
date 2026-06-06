import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RealtimeEventEntry, RealtimeVisitorSnapshot } from "@/lib/tracking-server/ingest";

export type RealtimeVisitorRaw = RealtimeVisitorSnapshot;

export type VisitorPresenceType = "guest" | "customer" | "staff" | "admin" | "owner";

export type EnrichedRealtimeVisitor = Omit<
  RealtimeVisitorRaw,
  "session_started_at" | "first_seen_at" | "first_interaction_at" | "current_page_started_at" | "recent_events"
> & {
  visitor_type: VisitorPresenceType;
  display_name: string | null;
  email: string | null;
  user_db_id: string | null;
  session_started_at: string;
  first_seen_at: string | null;
  first_interaction_at: string | null;
  current_page_started_at: string | null;
  last_event_at_iso: string;
  online_seconds: number;
  page_seconds: number;
  recent_events: RealtimeEventEntry[];
};

type UserLookup = {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  role: string;
};

const STOREFRONT_PATH_PREFIX = "/admin";
const PASSIVE_TRACK_EVENTS = new Set(["page_view", "heartbeat", "time_on_page"]);

export function isStorefrontVisitorPath(path: string | null | undefined): boolean {
  if (!path) return true;
  return !path.startsWith(STOREFRONT_PATH_PREFIX);
}

export function filterStorefrontVisitors<T extends { path?: string | null }>(
  visitors: T[],
): T[] {
  return visitors.filter((v) => isStorefrontVisitorPath(v.path));
}

function resolveVisitorType(role: string | null | undefined): VisitorPresenceType {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  if (role === "customer") return "customer";
  return "guest";
}

function toIso(ms: number | null | undefined, fallbackMs: number): string {
  const value = ms != null && Number.isFinite(ms) ? ms : fallbackMs;
  return new Date(value).toISOString();
}

async function loadVisitorTimingFromDb(visitors: RealtimeVisitorRaw[]): Promise<{
  firstSeenByVisitor: Map<string, string>;
  sessionById: Map<
    string,
    { started_at: string; entry_page: string | null; last_event_at: string }
  >;
  eventsBySession: Map<string, RealtimeEventEntry[]>;
}> {
  const firstSeenByVisitor = new Map<string, string>();
  const sessionById = new Map<
    string,
    { started_at: string; entry_page: string | null; last_event_at: string }
  >();
  const eventsBySession = new Map<string, RealtimeEventEntry[]>();

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return { firstSeenByVisitor, sessionById, eventsBySession };
  }

  const visitorIds = [...new Set(visitors.map((v) => v.visitor_id))];
  const sessionIds = [
    ...new Set(
      visitors.map((v) => v.session_id?.trim()).filter((id): id is string => Boolean(id)),
    ),
  ];

  if (visitorIds.length > 0) {
    const { data } = await supabase
      .from("tracking_visitors")
      .select("visitor_id, first_seen_at")
      .in("visitor_id", visitorIds);
    for (const row of data ?? []) {
      firstSeenByVisitor.set(String(row.visitor_id), String(row.first_seen_at));
    }
  }

  if (sessionIds.length > 0) {
    const { data: sessions } = await supabase
      .from("tracking_sessions")
      .select("session_id, started_at, entry_page, last_event_at")
      .in("session_id", sessionIds);
    for (const row of sessions ?? []) {
      sessionById.set(String(row.session_id), {
        started_at: String(row.started_at),
        entry_page: (row.entry_page as string | null) ?? null,
        last_event_at: String(row.last_event_at),
      });
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: events } = await supabase
      .from("tracking_events")
      .select("session_id, name, path, occurred_at")
      .in("session_id", sessionIds)
      .gte("occurred_at", cutoff)
      .order("occurred_at", { ascending: false })
      .limit(400);

    for (const row of events ?? []) {
      const sid = String(row.session_id);
      const list = eventsBySession.get(sid) ?? [];
      if (list.length >= 20) continue;
      list.push({
        name: String(row.name),
        path: (row.path as string | null) ?? null,
        occurred_at: String(row.occurred_at),
      });
      eventsBySession.set(sid, list);
    }
  }

  return { firstSeenByVisitor, sessionById, eventsBySession };
}

function pickFirstInteraction(
  events: RealtimeEventEntry[],
  sessionStartedIso: string,
): string | null {
  const startedMs = new Date(sessionStartedIso).getTime();
  const interaction = [...events]
    .reverse()
    .find((e) => !PASSIVE_TRACK_EVENTS.has(e.name));
  if (interaction) return interaction.occurred_at;

  const pageView = [...events]
    .reverse()
    .find((e) => e.name === "page_view" || e.name === "session_start");
  if (pageView) return pageView.occurred_at;

  return events.length > 0 ? events[events.length - 1].occurred_at : sessionStartedIso;
}

export async function enrichRealtimeVisitors(
  visitors: RealtimeVisitorRaw[],
): Promise<EnrichedRealtimeVisitor[]> {
  const clerkIds = [
    ...new Set(
      visitors.map((v) => v.clerk_user_id?.trim()).filter((id): id is string => Boolean(id)),
    ),
  ];

  const userByClerk = new Map<string, UserLookup>();
  const supabase = tryCreateSupabaseAdminClient();
  if (clerkIds.length > 0 && supabase) {
    const { data } = await supabase
      .from("users")
      .select("id, clerk_user_id, email, full_name, role")
      .in("clerk_user_id", clerkIds);
    for (const row of data ?? []) {
      userByClerk.set(String(row.clerk_user_id), row as UserLookup);
    }
  }

  const timing = await loadVisitorTimingFromDb(visitors);

  return visitors.map((visitor) => {
    const clerkId = visitor.clerk_user_id?.trim() ?? null;
    const user = clerkId ? userByClerk.get(clerkId) : undefined;
    const sessionId = visitor.session_id?.trim() ?? null;
    const sessionRow = sessionId ? timing.sessionById.get(sessionId) : undefined;

    const lastEventMs = visitor.last_event_at;
    const sessionStartedIso = sessionRow?.started_at
      ?? toIso(visitor.session_started_at, lastEventMs);
    const firstSeenIso =
      timing.firstSeenByVisitor.get(visitor.visitor_id)
      ?? (visitor.first_seen_at != null ? toIso(visitor.first_seen_at, lastEventMs) : null);
    const currentPageStartedIso = toIso(
      visitor.current_page_started_at,
      lastEventMs,
    );

    const dbEvents = sessionId ? (timing.eventsBySession.get(sessionId) ?? []) : [];
    const metaEvents = visitor.recent_events ?? [];
    const mergedEvents = new Map<string, RealtimeEventEntry>();
    for (const event of [...dbEvents, ...metaEvents]) {
      mergedEvents.set(`${event.name}:${event.occurred_at}`, event);
    }
    const recentEvents = [...mergedEvents.values()]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, 20);

    const firstInteractionIso =
      visitor.first_interaction_at != null
        ? toIso(visitor.first_interaction_at, lastEventMs)
        : pickFirstInteraction(recentEvents, sessionStartedIso);

    const sessionStartedMs = new Date(sessionStartedIso).getTime();
    const pageStartedMs = new Date(currentPageStartedIso).getTime();

    const identity = !clerkId || !user
      ? {
          visitor_type: "guest" as const,
          display_name: null,
          email: null,
          user_db_id: null,
        }
      : {
          visitor_type: resolveVisitorType(user.role),
          display_name: user.full_name?.trim() || null,
          email: user.email,
          user_db_id: user.id,
        };

    return {
      ...visitor,
      ...identity,
      session_started_at: sessionStartedIso,
      first_seen_at: firstSeenIso,
      first_interaction_at: firstInteractionIso,
      current_page_started_at: currentPageStartedIso,
      last_event_at_iso: new Date(lastEventMs).toISOString(),
      online_seconds: Math.max(0, Math.round((lastEventMs - sessionStartedMs) / 1000)),
      page_seconds: Math.max(0, Math.round((lastEventMs - pageStartedMs) / 1000)),
      recent_events: recentEvents,
    };
  });
}
