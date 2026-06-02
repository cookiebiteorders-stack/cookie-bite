import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTrackingRedis } from "./redis";
import type { ParsedTrackBatch, ParsedTrackEvent } from "./schema";
import type { GeoContext } from "./geo";
import { isUserAgentBot } from "./geo";

export interface IngestContext {
  geo: GeoContext;
  receivedAt: Date;
}

type InternalEvent = ParsedTrackEvent;

const REALTIME_KEY = "tracking:realtime:visitors";
const REALTIME_TTL_SECONDS = 5 * 60;

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

  await Promise.allSettled([
    upsertVisitor(supabase, batch, ctx, isBot),
    upsertSession(supabase, batch, ctx, isBot),
    insertEvents(supabase, batch, ctx, isBot),
    upsertRealtime(batch, isBot),
  ]);

  return { events: batch.events.length, bot: isBot, persisted: true };
}

async function upsertVisitor(
  supabase: SupabaseClient,
  batch: ParsedTrackBatch,
  ctx: IngestContext,
  isBot: boolean,
): Promise<void> {
  const { visitor, device, page } = batch;
  const firstUtm = batch.utm ?? null;
  await supabase
    .from("tracking_visitors")
    .upsert(
      {
        visitor_id: visitor.visitor_id,
        fingerprint: visitor.fingerprint ?? null,
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
): Promise<void> {
  const { visitor, device, page, utm } = batch;
  const lastEvent = batch.events[batch.events.length - 1];
  await supabase
    .from("tracking_sessions")
    .upsert(
      {
        session_id: visitor.session_id,
        visitor_id: visitor.visitor_id,
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
): Promise<void> {
  const eventsRows = batch.events.map((event) => buildEventRow(event, ctx, isBot));
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

function buildEventRow(event: InternalEvent, ctx: IngestContext, isBot: boolean) {
  return {
    event_id: event.event_id,
    visitor_id: event.visitor_id,
    session_id: event.session_id,
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

async function upsertRealtime(batch: ParsedTrackBatch, isBot: boolean): Promise<void> {
  if (isBot) return;
  const redis = await getTrackingRedis();
  const now = Date.now();
  const member = batch.visitor.visitor_id;
  const meta = JSON.stringify({
    session_id: batch.visitor.session_id,
    user_id: batch.visitor.user_id ?? null,
    path: batch.page?.path ?? "/",
    country: null,
    device_type: batch.device.device_type,
    last_event_at: now,
  });

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
  await supabase
    .from("tracking_realtime_users")
    .upsert(
      {
        visitor_id: batch.visitor.visitor_id,
        session_id: batch.visitor.session_id,
        last_event_at: new Date(now).toISOString(),
        path: batch.page?.path ?? null,
        device_type: batch.device.device_type,
      },
      { onConflict: "visitor_id", ignoreDuplicates: false },
    );
}

export async function readRealtimeUsers(windowSeconds = 300): Promise<{
  count: number;
  visitors: Array<{ visitor_id: string; path?: string | null; device_type?: string | null; last_event_at: number }>;
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
        return {
          visitor_id,
          path: asString(meta.path),
          device_type: asString(meta.device_type),
          last_event_at: Number(meta.last_event_at ?? Date.now()),
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
    .select("visitor_id, path, device_type, last_event_at")
    .gte("last_event_at", cutoff)
    .order("last_event_at", { ascending: false })
    .limit(500);
  const visitors = (data ?? []).map((row) => ({
    visitor_id: String(row.visitor_id),
    path: row.path as string | null,
    device_type: row.device_type as string | null,
    last_event_at: new Date(row.last_event_at).getTime(),
  }));
  return { count: visitors.length, visitors };
}
