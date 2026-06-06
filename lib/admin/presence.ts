import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCurrentAdminConsolePage, ADMIN_CONSOLE_NAV_ITEMS } from "@/lib/admin/admin-console-nav";
import { parseUserAgent } from "@/lib/admin/audit-display";
import type { UserRole } from "@/lib/admin/rbac";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTrackingRedis } from "@/lib/tracking-server/redis";

const PRESENCE_KEY = "admin:presence:staff";
const PRESENCE_TTL_SECONDS = 5 * 60;

export type AdminPresenceHeartbeat = {
  clerk_user_id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  current_path: string;
  last_action?: string | null;
  ip?: string | null;
  user_agent?: string | null;
};

export type AdminPresenceRecentAction = {
  action: string;
  module: string;
  created_at: string;
};

export type AdminPresenceRow = {
  clerk_user_id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  current_path: string | null;
  current_module: string | null;
  current_page_key: string | null;
  last_action: string | null;
  ip: string | null;
  device_label: string | null;
  last_seen_at: string;
  session_started_at: string;
  online_seconds: number;
  recent_actions: AdminPresenceRecentAction[];
};

function resolveModuleFromPath(path: string): { module: string | null; pageKey: string | null } {
  const item = resolveCurrentAdminConsolePage(path, ADMIN_CONSOLE_NAV_ITEMS);
  if (item) return { module: item.module, pageKey: item.navKey };
  if (path.startsWith("/admin")) return { module: "dashboard", pageKey: "dashboard" };
  return { module: null, pageKey: null };
}

function pickIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function upsertAdminPresence(
  input: AdminPresenceHeartbeat,
  req?: Request,
): Promise<void> {
  const now = Date.now();
  const { module, pageKey } = resolveModuleFromPath(input.current_path);
  const ip = input.ip ?? (req ? pickIp(req) : null);
  const userAgent = input.user_agent ?? req?.headers.get("user-agent") ?? null;

  const payload = {
    clerk_user_id: input.clerk_user_id,
    user_id: input.user_id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    current_path: input.current_path,
    current_module: module,
    last_action: input.last_action ?? null,
    ip,
    user_agent: userAgent,
    last_seen_at: new Date(now).toISOString(),
  };

  const redis = await getTrackingRedis();
  if (redis) {
    try {
      const meta = JSON.stringify({
        ...payload,
        current_page_key: pageKey,
        session_started_at: null as string | null,
      });
      const existingMeta = await redis.get(`admin:presence:meta:${input.clerk_user_id}`);
      let sessionStartedAt = new Date(now).toISOString();
      if (existingMeta) {
        try {
          const parsed = JSON.parse(existingMeta) as { session_started_at?: string | null };
          if (parsed.session_started_at) sessionStartedAt = parsed.session_started_at;
        } catch {
          // ignore
        }
      }
      const metaWithSession = JSON.stringify({
        ...JSON.parse(meta),
        session_started_at: sessionStartedAt,
      });
      const pipeline = redis.multi();
      pipeline.zadd(PRESENCE_KEY, now, input.clerk_user_id);
      pipeline.zremrangebyscore(PRESENCE_KEY, 0, now - PRESENCE_TTL_SECONDS * 1000);
      pipeline.set(
        `admin:presence:meta:${input.clerk_user_id}`,
        metaWithSession,
        "EX",
        PRESENCE_TTL_SECONDS,
      );
      await pipeline.exec();
    } catch (e) {
      console.warn("[admin-presence] redis upsert failed", e);
    }
  }

  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;

  const { data: existing } = await supabase
    .from("admin_presence_sessions")
    .select("session_started_at")
    .eq("clerk_user_id", input.clerk_user_id)
    .maybeSingle();

  await supabase.from("admin_presence_sessions").upsert(
    {
      ...payload,
      session_started_at: existing?.session_started_at ?? new Date(now).toISOString(),
    },
    { onConflict: "clerk_user_id", ignoreDuplicates: false },
  );
}

async function loadRecentActions(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, AdminPresenceRecentAction[]>> {
  const map = new Map<string, AdminPresenceRecentAction[]>();
  if (userIds.length === 0) return map;

  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("audit_logs")
    .select("actor_id, action, module, created_at")
    .in("actor_id", userIds)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(200);

  for (const row of data ?? []) {
    const actorId = row.actor_id as string | null;
    if (!actorId) continue;
    const list = map.get(actorId) ?? [];
    if (list.length >= 5) continue;
    list.push({
      action: String(row.action),
      module: String(row.module),
      created_at: String(row.created_at),
    });
    map.set(actorId, list);
  }
  return map;
}

function rowFromMeta(
  clerkUserId: string,
  meta: Record<string, unknown>,
  recentActions: AdminPresenceRecentAction[],
): AdminPresenceRow {
  const lastSeen = String(meta.last_seen_at ?? new Date().toISOString());
  const sessionStarted = String(meta.session_started_at ?? lastSeen);
  const lastSeenMs = new Date(lastSeen).getTime();
  const startedMs = new Date(sessionStarted).getTime();
  const ua = (meta.user_agent as string | null) ?? null;

  return {
    clerk_user_id: clerkUserId,
    user_id: (meta.user_id as string | null) ?? null,
    email: (meta.email as string | null) ?? null,
    full_name: (meta.full_name as string | null) ?? null,
    role: (meta.role as UserRole) ?? "staff",
    current_path: (meta.current_path as string | null) ?? null,
    current_module: (meta.current_module as string | null) ?? null,
    current_page_key: (meta.current_page_key as string | null) ?? null,
    last_action: (meta.last_action as string | null) ?? null,
    ip: (meta.ip as string | null) ?? null,
    device_label: parseUserAgent(ua),
    last_seen_at: lastSeen,
    session_started_at: sessionStarted,
    online_seconds: Math.max(0, Math.round((lastSeenMs - startedMs) / 1000)),
    recent_actions: recentActions,
  };
}

export async function readOnlineAdminStaff(windowSeconds = 300): Promise<{
  count: number;
  staff: AdminPresenceRow[];
}> {
  const since = Date.now() - windowSeconds * 1000;
  const supabase = tryCreateSupabaseAdminClient();

  const redis = await getTrackingRedis();
  if (redis) {
    try {
      const members = await redis.zrangebyscore(PRESENCE_KEY, since, "+inf");
      if (members.length === 0) return { count: 0, staff: [] };
      const metas = await redis.mget(...members.map((m) => `admin:presence:meta:${m}`));
      const userIds: string[] = [];
      const parsedRows: Array<{ clerkUserId: string; meta: Record<string, unknown> }> = [];

      members.forEach((clerkUserId, idx) => {
        let meta: Record<string, unknown> = {};
        try {
          meta = metas[idx] ? (JSON.parse(metas[idx] as string) as Record<string, unknown>) : {};
        } catch {
          meta = {};
        }
        parsedRows.push({ clerkUserId, meta });
        const uid = meta.user_id as string | null;
        if (uid) userIds.push(uid);
      });

      const recentMap = supabase ? await loadRecentActions(supabase, userIds) : new Map();
      const staff = parsedRows
        .map(({ clerkUserId, meta }) =>
          rowFromMeta(clerkUserId, meta, recentMap.get((meta.user_id as string) ?? "") ?? []),
        )
        .sort((a, b) => {
          const roleOrder = { owner: 0, admin: 1, staff: 2, customer: 3 };
          const ra = roleOrder[a.role] ?? 9;
          const rb = roleOrder[b.role] ?? 9;
          if (ra !== rb) return ra - rb;
          return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
        });

      return { count: staff.length, staff };
    } catch (e) {
      console.warn("[admin-presence] redis read failed", e);
    }
  }

  if (!supabase) return { count: 0, staff: [] };

  const cutoff = new Date(since).toISOString();
  const { data } = await supabase
    .from("admin_presence_sessions")
    .select("*")
    .gte("last_seen_at", cutoff)
    .order("last_seen_at", { ascending: false })
    .limit(50);

  const userIds = (data ?? [])
    .map((row) => row.user_id as string | null)
    .filter((id): id is string => Boolean(id));
  const recentMap = await loadRecentActions(supabase, userIds);

  const staff = (data ?? []).map((row) => {
    const path = (row.current_path as string | null) ?? "/admin";
    const { pageKey } = resolveModuleFromPath(path);
    const lastSeen = String(row.last_seen_at);
    const sessionStarted = String(row.session_started_at ?? lastSeen);
    const ua = (row.user_agent as string | null) ?? null;
    const userId = (row.user_id as string | null) ?? null;

    return {
      clerk_user_id: String(row.clerk_user_id),
      user_id: userId,
      email: (row.email as string | null) ?? null,
      full_name: (row.full_name as string | null) ?? null,
      role: (row.role as UserRole) ?? "staff",
      current_path: (row.current_path as string | null) ?? null,
      current_module: (row.current_module as string | null) ?? null,
      current_page_key: pageKey,
      last_action: (row.last_action as string | null) ?? null,
      ip: (row.ip as string | null) ?? null,
      device_label: parseUserAgent(ua),
      last_seen_at: lastSeen,
      session_started_at: sessionStarted,
      online_seconds: Math.max(
        0,
        Math.round(
          (new Date(lastSeen).getTime() - new Date(sessionStarted).getTime()) / 1000,
        ),
      ),
      recent_actions: userId ? (recentMap.get(userId) ?? []) : [],
    } satisfies AdminPresenceRow;
  });

  return { count: staff.length, staff };
}
