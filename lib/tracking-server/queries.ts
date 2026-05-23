import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_MS: Record<Range, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

export function rangeToCutoff(range: Range): string {
  return new Date(Date.now() - RANGE_MS[range]).toISOString();
}

function getClient(): SupabaseClient | null {
  return tryCreateSupabaseAdminClient();
}

export interface OverviewMetrics {
  range: Range;
  visitors: number;
  new_visitors: number;
  sessions: number;
  page_views: number;
  events: number;
  bounce_rate: number;
  avg_duration_seconds: number;
  conversions: number;
  conversion_rate: number;
  timeline: Array<{ bucket: string; sessions: number; visitors: number; pageviews: number }>;
}

const EMPTY_OVERVIEW = (range: Range): OverviewMetrics => ({
  range,
  visitors: 0,
  new_visitors: 0,
  sessions: 0,
  page_views: 0,
  events: 0,
  bounce_rate: 0,
  avg_duration_seconds: 0,
  conversions: 0,
  conversion_rate: 0,
  timeline: [],
});

export async function getOverview(range: Range = "7d"): Promise<OverviewMetrics> {
  const supabase = getClient();
  if (!supabase) return EMPTY_OVERVIEW(range);
  const cutoff = rangeToCutoff(range);

  const [sessionsRes, eventsRes, conversionsRes, pageviewsRes] = await Promise.all([
    supabase
      .from("tracking_sessions")
      .select("session_id, visitor_id, started_at, last_event_at, pageview_count, is_bot")
      .gte("started_at", cutoff)
      .eq("is_bot", false)
      .limit(50_000),
    supabase
      .from("tracking_events")
      .select("event_id, name, visitor_id, occurred_at, properties", { count: "exact", head: false })
      .gte("occurred_at", cutoff)
      .limit(50_000),
    supabase
      .from("tracking_conversions")
      .select("id, occurred_at, value", { count: "exact" })
      .gte("occurred_at", cutoff),
    supabase
      .from("tracking_page_views")
      .select("id, occurred_at, visitor_id", { count: "exact" })
      .gte("occurred_at", cutoff),
  ]);

  const sessions = sessionsRes.data ?? [];
  const events = eventsRes.data ?? [];
  const conversions = conversionsRes.count ?? 0;
  const pageViews = pageviewsRes.count ?? 0;

  const visitors = new Set(sessions.map((s) => String(s.visitor_id)));
  const sessionCount = sessions.length;
  const eventCount = eventsRes.count ?? events.length;

  let durationSum = 0;
  let durationCount = 0;
  let bounces = 0;
  for (const s of sessions) {
    const started = new Date(s.started_at as string).getTime();
    const last = new Date((s.last_event_at as string) ?? (s.started_at as string)).getTime();
    const duration = Math.max(0, Math.round((last - started) / 1000));
    if (duration > 0) {
      durationSum += duration;
      durationCount += 1;
    }
    if ((s.pageview_count as number) <= 1 && duration < 10) bounces += 1;
  }

  const timeline = buildTimeline(events, range);

  return {
    range,
    visitors: visitors.size,
    new_visitors: visitors.size, // refined when we add returning detection
    sessions: sessionCount,
    page_views: pageViews,
    events: eventCount,
    bounce_rate: sessionCount ? +(bounces / sessionCount).toFixed(4) : 0,
    avg_duration_seconds: durationCount ? Math.round(durationSum / durationCount) : 0,
    conversions,
    conversion_rate: sessionCount ? +(conversions / sessionCount).toFixed(4) : 0,
    timeline,
  };
}

function buildTimeline(
  events: Array<{ name: string; visitor_id: unknown; occurred_at: string }>,
  range: Range,
): OverviewMetrics["timeline"] {
  const buckets = new Map<string, { sessions: Set<string>; visitors: Set<string>; pageviews: number }>();
  const bucketSize =
    range === "24h" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const format = (t: number) => {
    const d = new Date(t);
    return range === "24h"
      ? d.toISOString().slice(0, 13) + ":00"
      : d.toISOString().slice(0, 10);
  };

  for (const evt of events) {
    const key = format(
      Math.floor(new Date(evt.occurred_at).getTime() / bucketSize) * bucketSize,
    );
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { sessions: new Set(), visitors: new Set(), pageviews: 0 };
      buckets.set(key, bucket);
    }
    bucket.visitors.add(String(evt.visitor_id));
    if (evt.name === "page_view") bucket.pageviews += 1;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, value]) => ({
      bucket,
      sessions: value.sessions.size,
      visitors: value.visitors.size,
      pageviews: value.pageviews,
    }));
}

export interface TopPageRow {
  path: string;
  views: number;
  unique_visitors: number;
  avg_seconds?: number;
}

export async function getTopPages(range: Range = "7d", limit = 20): Promise<TopPageRow[]> {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_page_views")
    .select("path, visitor_id")
    .gte("occurred_at", rangeToCutoff(range))
    .limit(50_000);
  if (!data) return [];
  const groups = new Map<string, { views: number; visitors: Set<string> }>();
  for (const row of data) {
    const path = String(row.path);
    let bucket = groups.get(path);
    if (!bucket) {
      bucket = { views: 0, visitors: new Set() };
      groups.set(path, bucket);
    }
    bucket.views += 1;
    bucket.visitors.add(String(row.visitor_id));
  }
  return Array.from(groups.entries())
    .map(([path, value]) => ({
      path,
      views: value.views,
      unique_visitors: value.visitors.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export async function getDevicesBreakdown(range: Range = "7d") {
  const supabase = getClient();
  if (!supabase) return { devices: [], browsers: [], oses: [] };
  const { data } = await supabase
    .from("tracking_sessions")
    .select("device_type, browser, os")
    .gte("started_at", rangeToCutoff(range))
    .eq("is_bot", false)
    .limit(50_000);

  const count = (key: keyof NonNullable<typeof data>[number]) => {
    const m = new Map<string, number>();
    for (const row of data ?? []) {
      const value = String(row[key] ?? "Unknown");
      m.set(value, (m.get(value) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  return { devices: count("device_type"), browsers: count("browser"), oses: count("os") };
}

export async function getReferrersBreakdown(range: Range = "7d") {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_sessions")
    .select("referrer, utm_source")
    .gte("started_at", rangeToCutoff(range))
    .eq("is_bot", false)
    .limit(50_000);
  const m = new Map<string, number>();
  for (const row of data ?? []) {
    const utm = row.utm_source ? `utm:${row.utm_source}` : null;
    const referrer = (row.referrer as string) || "direct";
    const key = utm ?? safeHost(referrer);
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .map(([source, sessions]) => ({ source, sessions }))
    .sort((a, b) => b.sessions - a.sessions);
}

function safeHost(referrer: string): string {
  if (!referrer || referrer === "direct") return "direct";
  try {
    return new URL(referrer).hostname || "direct";
  } catch {
    return "direct";
  }
}

export async function getRecentSessions(limit = 30) {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_sessions")
    .select(
      "session_id, visitor_id, started_at, last_event_at, entry_page, exit_page, device_type, browser, country, utm_source, pageview_count, event_count, is_bot",
    )
    .order("started_at", { ascending: false })
    .eq("is_bot", false)
    .limit(limit);
  return data ?? [];
}

export async function getSessionDetail(sessionId: string) {
  const supabase = getClient();
  if (!supabase) return null;
  const { data: session } = await supabase
    .from("tracking_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!session) return null;
  const { data: events } = await supabase
    .from("tracking_events")
    .select("event_id, name, path, occurred_at, properties")
    .eq("session_id", sessionId)
    .order("occurred_at", { ascending: true })
    .limit(2000);
  return { session, events: events ?? [] };
}

export async function getHeatmapForPath(path: string, deviceType: string) {
  const supabase = getClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tracking_heatmaps")
    .select("bucket_x, bucket_y, clicks, rage_clicks")
    .eq("path", path)
    .eq("device_type", deviceType)
    .limit(5000);
  return data ?? [];
}
