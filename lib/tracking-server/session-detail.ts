import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

const PASSIVE_EVENTS = new Set(["heartbeat", "replay_chunk"]);

export type SessionAction = {
  occurred_at: string;
  name: string;
  label: string;
  properties: Record<string, unknown>;
};

export type SessionClick = {
  occurred_at: string;
  element_tag: string | null;
  element_text: string | null;
  href: string | null;
  selector: string | null;
  is_rage: boolean;
};

export type SessionPageJourney = {
  index: number;
  path: string;
  title: string | null;
  referrer: string | null;
  entered_at: string;
  left_at: string | null;
  duration_seconds: number;
  max_scroll_pct: number | null;
  clicks: SessionClick[];
  actions: SessionAction[];
};

export type SessionTimelineEntry = {
  occurred_at: string;
  kind: "page" | "click" | "scroll" | "conversion" | "event";
  name: string;
  path: string | null;
  summary: string;
  detail?: Record<string, unknown>;
};

export type SessionVisitorInfo = {
  visitor_id: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  total_sessions: number | null;
  total_events: number | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  language: string | null;
  timezone: string | null;
  screen_width: number | null;
  screen_height: number | null;
  country: string | null;
  city: string | null;
  user_id: string | null;
};

export type SessionConversion = {
  goal: string;
  value: number | null;
  currency: string | null;
  occurred_at: string;
  metadata: Record<string, unknown>;
};

export type SessionDetailPayload = {
  session: Record<string, unknown>;
  visitor: SessionVisitorInfo | null;
  stats: {
    duration_seconds: number;
    page_views: number;
    clicks: number;
    scroll_events: number;
    custom_events: number;
    conversions: number;
    rage_clicks: number;
    is_bounce: boolean;
  };
  pages: SessionPageJourney[];
  timeline: SessionTimelineEntry[];
  conversions: SessionConversion[];
  has_recording: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function formatActionLabel(name: string, props: Record<string, unknown>): string {
  switch (name) {
    case "click":
    case "rage_click":
      return [props.tag, props.text].filter(Boolean).join(" · ") || "Click";
    case "scroll":
      return props.max_pct != null ? `Scrolled to ${props.max_pct}%` : "Scroll";
    case "form_submit":
      return props.form_id ? `Form submit · ${props.form_id}` : "Form submit";
    case "form_field_focus":
      return props.field ? `Focused · ${props.field}` : "Field focus";
    case "add_to_cart":
      return props.product_name ? `Add to cart · ${props.product_name}` : "Add to cart";
    case "purchase":
      return props.order_id ? `Purchase · ${props.order_id}` : "Purchase";
    case "search":
      return props.query ? `Search · ${props.query}` : "Search";
    case "session_start":
      return "Session started";
    case "session_end":
      return "Session ended";
    default:
      return name.replace(/_/g, " ");
  }
}

function computeDurationSeconds(
  enteredAt: string,
  leftAt: string,
  pageEvents: Array<{ name: string; properties: unknown }>,
): number {
  const finals = pageEvents
    .filter((e) => e.name === "time_on_page")
    .map((e) => Number(asRecord(e.properties).seconds ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0);
  const fromFinal = finals.length ? finals[finals.length - 1] : 0;
  const fromSpan = Math.max(
    0,
    Math.round((new Date(leftAt).getTime() - new Date(enteredAt).getTime()) / 1000),
  );
  return fromFinal || fromSpan;
}

function buildPageJourneys(input: {
  pageViews: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  clicks: Array<Record<string, unknown>>;
  scrolls: Array<Record<string, unknown>>;
  sessionEnd: string;
}): SessionPageJourney[] {
  const sortedPvs = [...input.pageViews].sort((a, b) =>
    String(a.occurred_at).localeCompare(String(b.occurred_at)),
  );

  return sortedPvs.map((pv, index) => {
    const enteredAt = String(pv.occurred_at);
    const nextEnter = sortedPvs[index + 1]?.occurred_at;
    const leftAt = nextEnter ? String(nextEnter) : input.sessionEnd;
    const path = String(pv.path ?? "/");

    const inRange = (occurredAt: string) =>
      occurredAt >= enteredAt && occurredAt < leftAt;

    const pageEvents = input.events.filter(
      (e) => String(e.path ?? "") === path && inRange(String(e.occurred_at)),
    );

    const pageClicks: SessionClick[] = input.clicks
      .filter((c) => String(c.path ?? "") === path && inRange(String(c.occurred_at)))
      .map((c) => ({
        occurred_at: String(c.occurred_at),
        element_tag: (c.element_tag as string | null) ?? null,
        element_text: (c.element_text as string | null) ?? null,
        href: (c.href as string | null) ?? null,
        selector: (c.selector as string | null) ?? null,
        is_rage: Boolean(c.is_rage),
      }));

    const scrollPcts = input.scrolls
      .filter((s) => String(s.path ?? "") === path && inRange(String(s.occurred_at)))
      .map((s) => Number(s.max_pct ?? s.depth ?? 0))
      .filter((n) => Number.isFinite(n));

    const actions: SessionAction[] = pageEvents
      .filter((e) => !["page_view", "time_on_page", "heartbeat", "replay_chunk"].includes(String(e.name)))
      .map((e) => {
        const props = asRecord(e.properties);
        return {
          occurred_at: String(e.occurred_at),
          name: String(e.name),
          label: formatActionLabel(String(e.name), props),
          properties: props,
        };
      });

    return {
      index: index + 1,
      path,
      title: (pv.title as string | null) ?? null,
      referrer: (pv.referrer as string | null) ?? null,
      entered_at: enteredAt,
      left_at: nextEnter ? leftAt : null,
      duration_seconds: computeDurationSeconds(
        enteredAt,
        leftAt,
        pageEvents.map((e) => ({
          name: String(e.name),
          properties: e.properties,
        })),
      ),
      max_scroll_pct: scrollPcts.length ? Math.max(...scrollPcts) : null,
      clicks: pageClicks,
      actions,
    };
  });
}

function buildTimeline(input: {
  pages: SessionPageJourney[];
  events: Array<Record<string, unknown>>;
  conversions: SessionConversion[];
}): SessionTimelineEntry[] {
  const rows: SessionTimelineEntry[] = [];

  for (const page of input.pages) {
    rows.push({
      occurred_at: page.entered_at,
      kind: "page",
      name: "page_view",
      path: page.path,
      summary: page.title ? `${page.path} · ${page.title}` : page.path,
      detail: {
        duration_seconds: page.duration_seconds,
        max_scroll_pct: page.max_scroll_pct,
      },
    });
    for (const click of page.clicks) {
      rows.push({
        occurred_at: click.occurred_at,
        kind: "click",
        name: click.is_rage ? "rage_click" : "click",
        path: page.path,
        summary: [click.element_tag, click.element_text].filter(Boolean).join(" · ") || "Click",
        detail: click as unknown as Record<string, unknown>,
      });
    }
    for (const action of page.actions) {
      rows.push({
        occurred_at: action.occurred_at,
        kind: "event",
        name: action.name,
        path: page.path,
        summary: action.label,
        detail: action.properties,
      });
    }
  }

  for (const conv of input.conversions) {
    rows.push({
      occurred_at: conv.occurred_at,
      kind: "conversion",
      name: conv.goal,
      path: null,
      summary: conv.value != null ? `${conv.goal} · ${conv.value}` : conv.goal,
      detail: conv.metadata,
    });
  }

  const seen = new Set<string>();
  return rows
    .filter((row) => {
      const key = `${row.kind}:${row.occurred_at}:${row.name}:${row.path ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

export async function fetchSessionDetail(sessionId: string): Promise<SessionDetailPayload | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;

  const { data: session } = await supabase
    .from("tracking_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const visitorId = String(session.visitor_id);

  const [
    visitorRes,
    pageViewsRes,
    eventsRes,
    clicksRes,
    scrollsRes,
    conversionsRes,
    recordingRes,
  ] = await Promise.all([
    supabase.from("tracking_visitors").select("*").eq("visitor_id", visitorId).maybeSingle(),
    supabase
      .from("tracking_page_views")
      .select("path, title, referrer, occurred_at, duration_seconds")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true })
      .limit(500),
    supabase
      .from("tracking_events")
      .select("event_id, name, path, title, url, occurred_at, properties")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true })
      .limit(5000),
    supabase
      .from("tracking_click_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true })
      .limit(2000),
    supabase
      .from("tracking_scroll_events")
      .select("*")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true })
      .limit(1000),
    supabase
      .from("tracking_conversions")
      .select("goal, value, currency, occurred_at, metadata")
      .eq("session_id", sessionId)
      .order("occurred_at", { ascending: true })
      .limit(100),
    supabase
      .from("tracking_events")
      .select("event_id")
      .eq("session_id", sessionId)
      .eq("name", "replay_chunk")
      .limit(1),
  ]);

  const sessionEnd = String(session.last_event_at ?? session.started_at);
  const started = new Date(String(session.started_at)).getTime();
  const ended = new Date(sessionEnd).getTime();
  const durationSeconds =
    session.duration_seconds != null
      ? Number(session.duration_seconds)
      : Math.max(0, Math.round((ended - started) / 1000));

  const events = eventsRes.data ?? [];
  const clicks = clicksRes.data ?? [];
  const scrolls = scrollsRes.data ?? [];

  const conversions: SessionConversion[] = (conversionsRes.data ?? []).map((row) => ({
    goal: String(row.goal),
    value: row.value != null ? Number(row.value) : null,
    currency: (row.currency as string | null) ?? null,
    occurred_at: String(row.occurred_at),
    metadata: asRecord(row.metadata),
  }));

  const pages = buildPageJourneys({
    pageViews: pageViewsRes.data ?? [],
    events,
    clicks,
    scrolls,
    sessionEnd,
  });

  const timeline = buildTimeline({ pages, events, conversions });

  const rageClicks = clicks.filter((c) => Boolean(c.is_rage)).length;
  const customEvents = events.filter(
    (e) => !PASSIVE_EVENTS.has(String(e.name)) && String(e.name) !== "page_view",
  ).length;

  const visitorRow = visitorRes.data;
  const visitor: SessionVisitorInfo | null = visitorRow
    ? {
        visitor_id: String(visitorRow.visitor_id),
        first_seen_at: (visitorRow.first_seen_at as string | null) ?? null,
        last_seen_at: (visitorRow.last_seen_at as string | null) ?? null,
        total_sessions: visitorRow.total_sessions != null ? Number(visitorRow.total_sessions) : null,
        total_events: visitorRow.total_events != null ? Number(visitorRow.total_events) : null,
        browser: (visitorRow.browser as string | null) ?? null,
        browser_version: (visitorRow.browser_version as string | null) ?? null,
        os: (visitorRow.os as string | null) ?? null,
        os_version: (visitorRow.os_version as string | null) ?? null,
        language: (visitorRow.language as string | null) ?? null,
        timezone: (visitorRow.timezone as string | null) ?? null,
        screen_width: visitorRow.screen_width != null ? Number(visitorRow.screen_width) : null,
        screen_height: visitorRow.screen_height != null ? Number(visitorRow.screen_height) : null,
        country: (visitorRow.country as string | null) ?? null,
        city: (visitorRow.city as string | null) ?? null,
        user_id: visitorRow.user_id ? String(visitorRow.user_id) : null,
      }
    : null;

  return {
    session: session as Record<string, unknown>,
    visitor,
    stats: {
      duration_seconds: durationSeconds,
      page_views: pages.length || Number(session.pageview_count ?? 0),
      clicks: clicks.length || Number(session.click_count ?? 0),
      scroll_events: scrolls.length,
      custom_events: customEvents,
      conversions: conversions.length,
      rage_clicks: rageClicks,
      is_bounce: Boolean(session.is_bounce),
    },
    pages,
    timeline,
    conversions,
    has_recording: (recordingRes.data?.length ?? 0) > 0,
  };
}

export function formatTrackingDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export function formatTrackingDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}
