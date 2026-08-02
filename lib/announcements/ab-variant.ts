import type { AnnouncementRecord } from "@/lib/announcements/types";

/** Stable variant per session + announcement (not random on every request). */
export function resolveAbVariantKey(
  record: AnnouncementRecord,
  sessionId: string,
): string | undefined {
  try {
    if (!record.ab_test?.enabled || !record.ab_test.variants.length) return undefined;
    const variants = record.ab_test.variants;

    // Ensure record.id is a valid string before constructing seed
    if (!record.id) return undefined;

    // Ensure sessionId is a valid string
    const safeSessionId = String(sessionId ?? "anonymous");
    const safeRecordId = String(record.id);

    let hash = 0;
    const seed = `${safeSessionId}:${safeRecordId}`;
    
    // Ensure seed is a string before iterating
    if (typeof seed !== "string" || seed.length === 0) return undefined;
    
    for (let i = 0; i < seed.length; i++) {
      const charCode = seed.charCodeAt(i);
      if (typeof charCode !== "number" || isNaN(charCode)) continue;
      hash = (hash * 31 + charCode) >>> 0;
    }
    const index = hash % variants.length;
    return variants[index]?.key;
  } catch (error) {
    console.error("[resolveAbVariantKey] Error:", error);
    return undefined;
  }
}
