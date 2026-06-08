import type { AnnouncementRecord } from "@/lib/announcements/types";

/** Stable variant per session + announcement (not random on every request). */
export function resolveAbVariantKey(
  record: AnnouncementRecord,
  sessionId: string,
): string | undefined {
  if (!record.ab_test?.enabled || !record.ab_test.variants.length) return undefined;
  const variants = record.ab_test.variants;
  let hash = 0;
  const seed = `${sessionId}:${record.id}`;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const index = hash % variants.length;
  return variants[index]?.key;
}
