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

type AdminPresenceMetaExtras = {
  session_started_at: string;
  first_interaction_at: string | null;
  current_page_started_at: string;
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
  first_interaction_at: string | null;
  current_page_started_at: string | null;
  online_seconds: number;
  page_seconds: number;
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
      const existingMeta = await redis.get(`admin:presence:meta:${input.clerk_user_id}`);
      const timing = resolveAdminPresenceTiming(
        existingMeta,
        input.current_path,
        now,
        input.last_action ?? null,
      );
      const metaWithSession = JSON.stringify({
        ...payload,
        current_page_key: pageKey,
        ...timing,
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

function resolveAdminPresenceTiming(
  existingMetaRaw: string | null,
  currentPath: string,
  now: number,
  lastAction: string | null,
): AdminPresenceMetaExtras {
  let existing: Record<string, unknown> = {};
  if (existingMetaRaw) {
    try {
      existing = JSON.parse(existingMetaRaw) as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }

  const nowIso = new Date(now).toISOString();
  const sessionStartedAt =
    typeof existing.session_started_at === "string"
      ? existing.session_started_at
      : nowIso;
  const prevPath = typeof existing.current_path === "string" ? existing.current_path : null;
  const currentPageStartedAt =
    prevPath && prevPath === currentPath && typeof existing.current_page_started_at === "string"
      ? existing.current_page_started_at
      : nowIso;

  let firstInteractionAt =
    typeof existing.first_interaction_at === "string" ? existing.first_interaction_at : null;
  if (!firstInteractionAt && lastAction) {
    firstInteractionAt = nowIso;
  }

  return {
    session_started_at: sessionStartedAt,
    first_interaction_at: firstInteractionAt,
    current_page_started_at: currentPageStartedAt,
  };
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
    .limit(300);

  for (const row of data ?? []) {
    const actorId = row.actor_id as string | null;
    if (!actorId) continue;
    const list = map.get(actorId) ?? [];
    if (list.length >= 20) continue;
    list.push({
      action: String(row.action),
      module: String(row.module),
      created_at: String(row.created_at),
    });
    map.set(actorId, list);
  }
  return map;
}

async function loadFirstInteractions(
  supabase: SupabaseClient,
  rows: Array<{ user_id: string | null; session_started_at: string }>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pairs = rows.filter((r): r is { user_id: string; session_started_at: string } =>
    Boolean(r.user_id),
  );
  if (pairs.length === 0) return map;

  await Promise.all(
    pairs.map(async ({ user_id, session_started_at }) => {
      const { data } = await supabase
        .from("audit_logs")
        .select("created_at")
        .eq("actor_id", user_id)
        .gte("created_at", session_started_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data?.created_at) {
        map.set(user_id, String(data.created_at));
      }
    }),
  );

  return map;
}

function rowFromMeta(
  clerkUserId: string,
  meta: Record<string, unknown>,
  recentActions: AdminPresenceRecentAction[],
  firstInteractionOverride?: string | null,
): AdminPresenceRow {
  const lastSeen = String(meta.last_seen_at ?? new Date().toISOString());
  const sessionStarted = String(meta.session_started_at ?? lastSeen);
  const currentPageStarted = String(meta.current_page_started_at ?? sessionStarted);
  const lastSeenMs = new Date(lastSeen).getTime();
  const startedMs = new Date(sessionStarted).getTime();
  const pageStartedMs = new Date(currentPageStarted).getTime();
  const ua = (meta.user_agent as string | null) ?? null;
  const firstFromMeta =
    typeof meta.first_interaction_at === "string" ? meta.first_interaction_at : null;
  const firstFromAudit = recentActions.length
    ? recentActions[recentActions.length - 1].created_at
    : null;
  const firstInteractionAt =
    firstInteractionOverride ?? firstFromMeta ?? firstFromAudit ?? sessionStarted;

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
    first_interaction_at: firstInteractionAt,
    current_page_started_at: currentPageStarted,
    online_seconds: Math.max(0, Math.round((lastSeenMs - startedMs) / 1000)),
    page_seconds: Math.max(0, Math.round((lastSeenMs - pageStartedMs) / 1000)),
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
      const firstInteractionMap = supabase
        ? await loadFirstInteractions(
            supabase,
            parsedRows.map(({ meta }) => ({
              user_id: (meta.user_id as string | null) ?? null,
              session_started_at: String(meta.session_started_at ?? meta.last_seen_at ?? new Date().toISOString()),
            })),
          )
        : new Map<string, string>();
      const staff = parsedRows
        .map(({ clerkUserId, meta }) => {
          const uid = (meta.user_id as string) ?? "";
          return rowFromMeta(
            clerkUserId,
            meta,
            recentMap.get(uid) ?? [],
            uid ? firstInteractionMap.get(uid) ?? null : null,
          );
        })
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
  const firstInteractionMap = await loadFirstInteractions(
    supabase,
    (data ?? []).map((row) => ({
      user_id: (row.user_id as string | null) ?? null,
      session_started_at: String(row.session_started_at ?? row.last_seen_at),
    })),
  );

  const staff = (data ?? []).map((row) => {
    const path = (row.current_path as string | null) ?? "/admin";
    const { pageKey } = resolveModuleFromPath(path);
    const lastSeen = String(row.last_seen_at);
    const sessionStarted = String(row.session_started_at ?? lastSeen);
    const currentPageStarted = sessionStarted;
    const ua = (row.user_agent as string | null) ?? null;
    const userId = (row.user_id as string | null) ?? null;
    const recentActions = userId ? (recentMap.get(userId) ?? []) : [];
    const firstInteractionAt =
      (userId ? firstInteractionMap.get(userId) : null)
      ?? (recentActions.length ? recentActions[recentActions.length - 1].created_at : null)
      ?? sessionStarted;

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
      first_interaction_at: firstInteractionAt,
      current_page_started_at: currentPageStarted,
      online_seconds: Math.max(
        0,
        Math.round(
          (new Date(lastSeen).getTime() - new Date(sessionStarted).getTime()) / 1000,
        ),
      ),
      page_seconds: Math.max(
        0,
        Math.round(
          (new Date(lastSeen).getTime() - new Date(currentPageStarted).getTime()) / 1000,
        ),
      ),
      recent_actions: recentActions,
    } satisfies AdminPresenceRow;
  });

  return { count: staff.length, staff };
}
