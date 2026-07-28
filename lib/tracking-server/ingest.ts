import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTrackingRedis } from "./redis";
import type { ParsedTrackBatch, ParsedTrackEvent } from "./schema";
import type { GeoContext } from "./geo";
import { isUserAgentBot } from "./geo";
import { resolveDbUserId } from "./visitor-identity";

export interface IngestContext {
  geo: GeoContext;
  receivedAt: Date;
}

type InternalEvent = ParsedTrackEvent;

const REALTIME_KEY = "tracking:realtime:visitors";
const REALTIME_TTL_SECONDS = 5 * 60;
const PASSIVE_TRACK_EVENTS = new Set(["page_view", "heartbeat", "time_on_page"]);

type RealtimeEventSnippet = {
  name: string;
  path: string | null;
  occurred_at: string;
};

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function asInt(value: unknown): number | null {
  const n = asNumber(value);
  return n === null ? null : Math.round(n);
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

/**
 * Push the batch through validation, persistence and realtime markers.
 * Returns a small summary used by the API route response.
 */
export async function ingestBatch(
  batch: ParsedTrackBatch,
  ctx: IngestContext,
): Promise<{ events: number; bot: boolean; persisted: boolean }> {
  const supabase = tryCreateSupabaseAdminClient();
  const ua = batch.device.user_agent ?? null;
  const isBot = Boolean(batch.device.is_bot) || isUserAgentBot(ua);

  if (!supabase) {
    return { events: batch.events.length, bot: isBot, persisted: false };
  }

  const dbUserId = await resolveDbUserId(supabase, batch.visitor.user_id);

  await Promise.allSettled([
    upsertVisitor(supabase, batch, ctx, isBot, dbUserId),
    upsertSession(supabase, batch, ctx, isBot, dbUserId),
    insertEvents(supabase, batch, ctx, isBot, dbUserId),
    upsertRealtime(batch, ctx, isBot),
  ]);

  return { events: batch.events.length, bot: isBot, persisted: true };
}

async function upsertVisitor(
  supabase: SupabaseClient,
  batch: ParsedTrackBatch,
  ctx: IngestContext,
  isBot: boolean,
  dbUserId: string | null,
): Promise<void> {
  const { visitor, device, page } = batch;
  const firstUtm = batch.utm ?? null;
  await supabase
    .from("tracking_visitors")
    .upsert(
      {
        visitor_id: visitor.visitor_id,
        fingerprint: visitor.fingerprint ?? null,
        user_id: dbUserId,
        last_seen_at: ctx.receivedAt.toISOString(),
        device_type: device.device_type,
        browser: device.browser ?? null,
        browser_version: device.browser_version ?? null,
        os: device.os ?? null,
        os_version: device.os_version ?? null,
        language: device.language ?? null,
        timezone: device.timezone ?? null,
        screen_width: device.screen_width ?? null,
        screen_height: device.screen_height ?? null,
        country: ctx.geo.country,
        city: ctx.geo.city,
        is_bot: isBot,
        first_referrer: page.referrer ?? null,
        first_utm: firstUtm ?? {},
      },
      { onConflict: "visitor_id", ignoreDuplicates: false },
    );
}

async function upsertSession(
  supabase: SupabaseClient,
  batch: ParsedTrackBatch,
  ctx: IngestContext,
  isBot: boolean,
  dbUserId: string | null,
): Promise<void> {
  const { visitor, device, page, utm } = batch;
  const lastEvent = batch.events[batch.events.length - 1];
  await supabase
    .from("tracking_sessions")
    .upsert(
      {
        session_id: visitor.session_id,
        visitor_id: visitor.visitor_id,
        user_id: dbUserId,
        last_event_at: ctx.receivedAt.toISOString(),
        entry_page: page.path,
        exit_page: lastEvent?.page?.path ?? page.path,
        referrer: page.referrer ?? null,
        utm_source: utm?.utm_source ?? null,
        utm_medium: utm?.utm_medium ?? null,
        utm_campaign: utm?.utm_campaign ?? null,
        utm_term: utm?.utm_term ?? null,
        utm_content: utm?.utm_content ?? null,
        device_type: device.device_type,
        browser: device.browser ?? null,
        os: device.os ?? null,
        country: ctx.geo.country,
        city: ctx.geo.city,
        ip: ctx.geo.ip,
        is_bot: isBot,
      },
      { onConflict: "session_id", ignoreDuplicates: false },
    );
}

async function insertEvents(
  supabase: SupabaseClient,
  batch: ParsedTrackBatch,
  ctx: IngestContext,
  isBot: boolean,
  dbUserId: string | null,
): Promise<void> {
  const eventsRows = batch.events.map((event) => buildEventRow(event, ctx, isBot, dbUserId));
  if (eventsRows.length === 0) return;

  await supabase.from("tracking_events").upsert(eventsRows, {
    onConflict: "event_id",
    ignoreDuplicates: true,
  });

  const pageViews = batch.events.filter((e) => e.name === "page_view").map(buildPageViewRow);
  if (pageViews.length > 0) {
    await supabase.from("tracking_page_views").upsert(pageViews, {
      onConflict: "event_id",
      ignoreDuplicates: true,
    });
  }

  const clicks = batch.events
    .filter((e) => e.name === "click" || e.name === "rage_click")
    .map((e) => buildClickRow(e));
  if (clicks.length > 0) {
    await supabase.from("tracking_click_events").upsert(clicks, {
      onConflict: "event_id",
      ignoreDuplicates: true,
    });

    await rollUpHeatmap(supabase, batch.events);
  }

  const scrolls = batch.events.filter((e) => e.name === "scroll").map(buildScrollRow);
  if (scrolls.length > 0) {
    await supabase.from("tracking_scroll_events").upsert(scrolls, {
      onConflict: "event_id",
      ignoreDuplicates: true,
    });
  }
}

function buildEventRow(
  event: InternalEvent,
  ctx: IngestContext,
  isBot: boolean,
  dbUserId: string | null,
) {
  return {
    event_id: event.event_id,
    visitor_id: event.visitor_id,
    session_id: event.session_id,
    user_id: dbUserId,
    name: event.name,
    path: event.page?.path ?? null,
    url: event.page?.url ?? null,
    title: event.page?.title ?? null,
    referrer: event.page?.referrer ?? null,
    occurred_at: event.timestamp,
    received_at: ctx.receivedAt.toISOString(),
    properties: { ...(event.properties ?? {}), is_bot: isBot },
    device_type: event.device?.device_type ?? null,
    browser: event.device?.browser ?? null,
    os: event.device?.os ?? null,
    country: ctx.geo.country,
    ip: ctx.geo.ip,
  };
}

function buildPageViewRow(event: InternalEvent) {
  return {
    event_id: event.event_id,
    visitor_id: event.visitor_id,
    session_id: event.session_id,
    path: event.page?.path ?? "/",
    title: event.page?.title ?? null,
    referrer: event.page?.referrer ?? null,
    device_type: event.device?.device_type ?? null,
    occurred_at: event.timestamp,
  };
}

function buildClickRow(event: InternalEvent) {
  const props = event.properties ?? {};
  return {
    event_id: event.event_id,
    visitor_id: event.visitor_id,
    session_id: event.session_id,
    path: event.page?.path ?? "/",
    selector: asString(props.selector),
    element_tag: asString(props.tag),
    element_text: asString(props.text),
    href: asString(props.href),
    x: asInt(props.x),
    y: asInt(props.y),
    page_x: asInt(props.page_x),
    page_y: asInt(props.page_y),
    viewport_width: asInt(props.vw ?? event.device?.viewport_width),
    viewport_height: asInt(props.vh ?? event.device?.viewport_height),
    is_rage: event.name === "rage_click" || asBoolean(props.is_rage),
    occurred_at: event.timestamp,
  };
}

function buildScrollRow(event: InternalEvent) {
  const props = event.properties ?? {};
  return {
    event_id: event.event_id,
    visitor_id: event.visitor_id,
    session_id: event.session_id,
    path: event.page?.path ?? "/",
    depth: asInt(props.depth) ?? 0,
    max_pct: asInt(props.max_pct),
    occurred_at: event.timestamp,
  };
}

async function rollUpHeatmap(
  supabase: SupabaseClient,
  events: ReadonlyArray<InternalEvent>,
): Promise<void> {
  type Cell = { path: string; device_type: string; bucket_x: number; bucket_y: number; clicks: number; rage_clicks: number };
  const grid = new Map<string, Cell>();

  for (const event of events) {
    if (event.name !== "click" && event.name !== "rage_click") continue;
    const props = event.properties ?? {};
    const vw = asInt(props.vw ?? event.device?.viewport_width);
    const vh = asInt(props.vh ?? event.device?.viewport_height);
    const x = asInt(props.x);
    const y = asInt(props.y);
    if (!vw || !vh || x === null || y === null) continue;

    const path = event.page?.path ?? "/";
    const device = event.device?.device_type ?? "desktop";
    const bucket_x = Math.min(49, Math.max(0, Math.floor((x / vw) * 50)));
    const bucket_y = Math.min(49, Math.max(0, Math.floor((y / vh) * 50)));
    const key = `${path}|${device}|${bucket_x}|${bucket_y}`;
    const existing = grid.get(key);
    if (existing) {
      existing.clicks += 1;
      if (event.name === "rage_click") existing.rage_clicks += 1;
    } else {
      grid.set(key, {
        path,
        device_type: device,
        bucket_x,
        bucket_y,
        clicks: 1,
        rage_clicks: event.name === "rage_click" ? 1 : 0,
      });
    }
  }

  if (grid.size === 0) return;

  await supabase.rpc("tracking_heatmap_increment", { cells: Array.from(grid.values()) }).then(
    (res: { error?: unknown }) => {
      if (!res.error) return;
      // Fallback when the RPC is missing: best-effort upsert (race-safe enough for small bursts).
      const rows = Array.from(grid.values()).map((c) => ({
        ...c,
        updated_at: new Date().toISOString(),
      }));
      return supabase.from("tracking_heatmaps").upsert(rows, {
        onConflict: "path,device_type,bucket_x,bucket_y",
      });
    },
    () => undefined,
  );
}

function buildRealtimeMetaPayload(
  batch: ParsedTrackBatch,
  ctx: IngestContext,
  now: number,
  existingRaw: string | null,
): Record<string, unknown> {
  let existing: Record<string, unknown> = {};
  if (existingRaw) {
    try {
      existing = JSON.parse(existingRaw) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }

  const sessionId = batch.visitor.session_id;
  const path = batch.page?.path ?? "/";
  const clerkUserId = batch.visitor.user_id ?? null;
  const prevSessionId = asString(existing.session_id);
  const prevPath = asString(existing.path);
  const isNewSession = !prevSessionId || prevSessionId !== sessionId;
  const isNewPath = !isNewSession && prevPath !== path;

  const sessionStartedAt = isNewSession ? now : Number(existing.session_started_at ?? now);
  const firstSeenAt = Number(existing.first_seen_at ?? now);
  const currentPageStartedAt =
    isNewSession || isNewPath ? now : Number(existing.current_page_started_at ?? now);

  let firstInteractionAt: number | null =
    existing.first_interaction_at != null ? Number(existing.first_interaction_at) : null;

  const recentMap = new Map<string, RealtimeEventSnippet>();
  if (Array.isArray(existing.recent_events)) {
    for (const row of existing.recent_events) {
      if (!row || typeof row !== "object") continue;
      const snippet = row as RealtimeEventSnippet;
      if (!snippet.occurred_at) continue;
      recentMap.set(`${snippet.name}:${snippet.occurred_at}`, snippet);
    }
  }

  for (const event of batch.events) {
    const occurredAt = event.timestamp;
    const ts = new Date(occurredAt).getTime();
    const snippet: RealtimeEventSnippet = {
      name: event.name,
      path: event.page?.path ?? null,
      occurred_at: occurredAt,
    };
    recentMap.set(`${snippet.name}:${snippet.occurred_at}`, snippet);
    if (!firstInteractionAt && !PASSIVE_TRACK_EVENTS.has(event.name)) {
      firstInteractionAt = ts;
    }
    if (event.name === "session_start" && isNewSession) {
      // session_start is the authoritative session boundary when present
    }
  }

  const recentEvents = [...recentMap.values()]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 20);

  const lastEvent = batch.events[batch.events.length - 1];

  return {
    session_id: sessionId,
    supabase_user_id: clerkUserId,
    user_id: clerkUserId,
    path,
    country: ctx.geo.country,
    device_type: batch.device.device_type,
    last_event_at: now,
    last_event_name: lastEvent?.name ?? null,
    session_started_at: sessionStartedAt,
    first_seen_at: firstSeenAt,
    first_interaction_at: firstInteractionAt,
    current_page_started_at: currentPageStartedAt,
    recent_events: recentEvents,
  };
}

async function upsertRealtime(
  batch: ParsedTrackBatch,
  ctx: IngestContext,
  isBot: boolean,
): Promise<void> {
  if (isBot) return;
  const redis = await getTrackingRedis();
  const now = Date.now();
  const member = batch.visitor.visitor_id;
  const clerkUserId = batch.visitor.user_id ?? null;

  let existingRaw: string | null = null;
  if (redis) {
    try {
      existingRaw = await redis.get(`tracking:realtime:meta:${member}`);
    } catch {
      existingRaw = null;
    }
  }

  const metaPayload = buildRealtimeMetaPayload(batch, ctx, now, existingRaw);
  const meta = JSON.stringify(metaPayload);

  if (redis) {
    try {
      const pipeline = redis.multi();
      pipeline.zadd(REALTIME_KEY, now, member);
      pipeline.zremrangebyscore(REALTIME_KEY, 0, now - REALTIME_TTL_SECONDS * 1000);
      pipeline.set(`tracking:realtime:meta:${member}`, meta, "EX", REALTIME_TTL_SECONDS);
      await pipeline.exec();
    } catch (e) {
      console.warn("[tracking-realtime] redis upsert failed", e);
    }
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;
  const dbUserId = await resolveDbUserId(supabase, clerkUserId);

  await supabase
    .from("tracking_realtime_users")
    .upsert(
      {
        visitor_id: batch.visitor.visitor_id,
        session_id: batch.visitor.session_id,
        user_id: dbUserId,
        last_event_at: new Date(now).toISOString(),
        path: batch.page?.path ?? null,
        country: ctx.geo.country,
        device_type: batch.device.device_type,
      },
      { onConflict: "visitor_id", ignoreDuplicates: false },
    );
}

export type RealtimeEventEntry = {
  name: string;
  path: string | null;
  occurred_at: string;
};

export type RealtimeVisitorSnapshot = {
  visitor_id: string;
  session_id?: string | null;
  supabase_user_id?: string | null;
  path?: string | null;
  device_type?: string | null;
  country?: string | null;
  last_event_at: number;
  last_event_name?: string | null;
  session_started_at?: number | null;
  first_seen_at?: number | null;
  first_interaction_at?: number | null;
  current_page_started_at?: number | null;
  recent_events?: RealtimeEventEntry[];
};

export async function readRealtimeUsers(windowSeconds = 300): Promise<{
  count: number;
  visitors: RealtimeVisitorSnapshot[];
}> {
  const redis = await getTrackingRedis();
  if (redis) {
    try {
      const since = Date.now() - windowSeconds * 1000;
      const members = await redis.zrangebyscore(REALTIME_KEY, since, "+inf");
      if (members.length === 0) return { count: 0, visitors: [] };
      const metas = await redis.mget(...members.map((m) => `tracking:realtime:meta:${m}`));
      const visitors = members.map((visitor_id, idx) => {
        let meta: Record<string, unknown> = {};
        try {
          meta = metas[idx] ? JSON.parse(metas[idx] as string) : {};
        } catch {
          meta = {};
        }
        const recentEvents = Array.isArray(meta.recent_events)
          ? (meta.recent_events as RealtimeEventEntry[])
          : [];
        return {
          visitor_id,
          session_id: asString(meta.session_id),
          supabase_user_id: asString(meta.supabase_user_id) ?? asString(meta.user_id),
          path: asString(meta.path),
          device_type: asString(meta.device_type),
          country: asString(meta.country),
          last_event_at: Number(meta.last_event_at ?? Date.now()),
          last_event_name: asString(meta.last_event_name),
          session_started_at:
            meta.session_started_at != null ? Number(meta.session_started_at) : null,
          first_seen_at: meta.first_seen_at != null ? Number(meta.first_seen_at) : null,
          first_interaction_at:
            meta.first_interaction_at != null ? Number(meta.first_interaction_at) : null,
          current_page_started_at:
            meta.current_page_started_at != null ? Number(meta.current_page_started_at) : null,
          recent_events: recentEvents,
        };
      });
      return { count: visitors.length, visitors };
    } catch (e) {
      console.warn("[tracking-realtime] redis read failed", e);
    }
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return { count: 0, visitors: [] };
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { data } = await supabase
    .from("tracking_realtime_users")
    .select("visitor_id, session_id, user_id, path, country, device_type, last_event_at")
    .gte("last_event_at", cutoff)
    .order("last_event_at", { ascending: false })
    .limit(500);
  const dbUserIds = [
    ...new Set(
      (data ?? [])
        .map((row) => (row.user_id ? String(row.user_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const supabaseByDbId = new Map<string, string>();
  if (dbUserIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, supabase_user_id")
      .in("id", dbUserIds);
    for (const user of users ?? []) {
      supabaseByDbId.set(String(user.id), String(user.supabase_user_id));
    }
  }

  const visitors = (data ?? []).map((row) => {
    const dbUserId = row.user_id ? String(row.user_id) : null;
    return {
      visitor_id: String(row.visitor_id),
      session_id: row.session_id as string | null,
      supabase_user_id: dbUserId ? (supabaseByDbId.get(dbUserId) ?? null) : null,
      path: row.path as string | null,
      device_type: row.device_type as string | null,
      country: row.country as string | null,
      last_event_at: new Date(row.last_event_at).getTime(),
      last_event_name: null,
      session_started_at: null,
      first_seen_at: null,
      first_interaction_at: null,
      current_page_started_at: null,
      recent_events: [],
    };
  });
  return { count: visitors.length, visitors };
}
