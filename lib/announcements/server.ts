import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ANNOUNCEMENTS_CACHE_TAG,
  isScheduleActive,
  normalizeAbTest,
  normalizeAnnouncementRow,
  normalizeAudience,
  normalizeFrequency,
  normalizeTrigger,
} from "@/lib/announcements/shared";
import { resolveAbVariantKey } from "@/lib/announcements/ab-variant";
import { filterAnnouncementsForContext } from "@/lib/announcements/targeting";
import type {
  AnnouncementCreateInput,
  AnnouncementRecord,
  AnnouncementUpdateInput,
  AnnouncementUserContext,
  AnnouncementView,
  TrackEventType,
} from "@/lib/announcements/types";
import { toAnnouncementView } from "@/lib/announcements/shared";

const MEMORY_TTL_MS = 30_000;
let memoryCache: AnnouncementRecord[] | null = null;
let memoryExpiresAt = 0;

function setMemoryCache(records: AnnouncementRecord[]) {
  memoryCache = records;
  memoryExpiresAt = Date.now() + MEMORY_TTL_MS;
}

export function invalidateAnnouncementsCache() {
  memoryCache = null;
  memoryExpiresAt = 0;
  try {
    revalidateTag(ANNOUNCEMENTS_CACHE_TAG, "max");
  } catch {
    /* edge */
  }
}

async function loadAnnouncementsFromDb(): Promise<AnnouncementRecord[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .in("status", ["active", "scheduled"])
    .order("priority", { ascending: false });

  if (error) {
    const missing =
      error.code === "42P01" ||
      error.message.includes("announcements") ||
      error.message.includes("does not exist");
    if (missing) return [];
    console.error("[announcements] read failed", error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    normalizeAnnouncementRow(row as Record<string, unknown>),
  );
}

const getCachedAnnouncements = unstable_cache(
  loadAnnouncementsFromDb,
  ["store-announcements-active"],
  { revalidate: 60, tags: [ANNOUNCEMENTS_CACHE_TAG] },
);

export async function expireDueAnnouncements(): Promise<number> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return 0;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .update({ status: "expired", updated_at: now })
    .in("status", ["active", "scheduled"])
    .lt("end_at", now)
    .not("end_at", "is", null)
    .select("id");

  if (error || !data?.length) return 0;
  invalidateAnnouncementsCache();
  return data.length;
}

export async function getActiveAnnouncements(): Promise<AnnouncementRecord[]> {
  await expireDueAnnouncements();
  if (memoryCache && Date.now() < memoryExpiresAt) return memoryCache;
  const records = await getCachedAnnouncements();
  const active = records.filter((r) => isScheduleActive(r));
  setMemoryCache(active);
  return active;
}

export async function getAllAnnouncementsAdmin(): Promise<AnnouncementRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    normalizeAnnouncementRow(row as Record<string, unknown>),
  );
}

export async function getAnnouncementById(id: string): Promise<AnnouncementRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeAnnouncementRow(data as Record<string, unknown>);
}

export async function getAnnouncementsForUser(
  ctx: AnnouncementUserContext,
  lang: "en" | "ar",
  sessionId = "anon",
): Promise<AnnouncementView[]> {
  const records = await getActiveAnnouncements();
  const filtered = filterAnnouncementsForContext(records, ctx);
  return filtered.map((record) => {
    const abVariantKey = resolveAbVariantKey(record, sessionId);
    return toAnnouncementView(record, lang, { userName: ctx.userName, abVariantKey });
  });
}

function rowFromInput(
  input: AnnouncementCreateInput | AnnouncementUpdateInput,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  const keys: (keyof AnnouncementCreateInput)[] = [
    "type",
    "title_en",
    "title_ar",
    "message_en",
    "message_ar",
    "cta_label_en",
    "cta_label_ar",
    "cta_url",
    "priority",
    "status",
    "start_at",
    "end_at",
    "target_pages",
    "audience",
    "trigger_config",
    "frequency",
    "dismissible",
    "variant",
    "design",
    "ab_test",
  ];
  for (const key of keys) {
    if (key in input && input[key] !== undefined) {
      row[key] = input[key];
    }
  }
  row.updated_at = new Date().toISOString();
  return row;
}

function normalizeCreateInput(input: AnnouncementCreateInput): AnnouncementCreateInput {
  return {
    ...input,
    audience: normalizeAudience(input.audience),
    trigger_config: normalizeTrigger(input.trigger_config),
    frequency: normalizeFrequency(input.frequency),
    ab_test: normalizeAbTest(input.ab_test),
  };
}

export async function createAnnouncement(
  input: AnnouncementCreateInput,
  createdBy: string | null,
): Promise<AnnouncementRecord> {
  const supabase = createSupabaseAdminClient();
  const normalized = normalizeCreateInput(input);
  const payload = {
    ...rowFromInput(normalized),
    created_by: createdBy,
    metrics: { impressions: 0, clicks: 0, dismissals: 0 },
  };

  const { data, error } = await supabase
    .from("announcements")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  invalidateAnnouncementsCache();
  return normalizeAnnouncementRow(data as Record<string, unknown>);
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementUpdateInput,
): Promise<AnnouncementRecord> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("announcements")
    .update(rowFromInput(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  invalidateAnnouncementsCache();
  return normalizeAnnouncementRow(data as Record<string, unknown>);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateAnnouncementsCache();
}

export async function trackAnnouncementEvent(params: {
  announcementId: string;
  eventType: TrackEventType;
  userId?: string | null;
  sessionId?: string | null;
  page?: string | null;
  variantKey?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { error: eventError } = await supabase.from("announcement_events").insert({
    announcement_id: params.announcementId,
    event_type: params.eventType,
    user_id: params.userId ?? null,
    session_id: params.sessionId ?? null,
    page: params.page ?? null,
    variant_key: params.variantKey ?? null,
    metadata: params.metadata ?? {},
  });

  if (eventError) {
    console.error("[announcements] track event failed", eventError.message);
    return;
  }

  const metricKey =
    params.eventType === "impression"
      ? "impressions"
      : params.eventType === "click"
        ? "clicks"
        : params.eventType === "dismiss"
          ? "dismissals"
          : null;

  if (metricKey) {
    const record = await getAnnouncementById(params.announcementId);
    if (record) {
      const nextMetrics = { ...record.metrics, [metricKey]: record.metrics[metricKey] + 1 };
      await supabase
        .from("announcements")
        .update({ metrics: nextMetrics, updated_at: new Date().toISOString() })
        .eq("id", params.announcementId);
      invalidateAnnouncementsCache();
    }
  }

  if (params.userId) {
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { updated_at: now };
    if (params.eventType === "impression") {
      patch.seen_at = now;
      patch.impression_count = 1;
    }
    if (params.eventType === "dismiss") patch.dismissed_at = now;
    if (params.eventType === "click") patch.clicked_at = now;

    await supabase.from("announcement_user_state").upsert(
      {
        announcement_id: params.announcementId,
        user_id: params.userId,
        ...patch,
      },
      { onConflict: "announcement_id,user_id" },
    );
  }
}
