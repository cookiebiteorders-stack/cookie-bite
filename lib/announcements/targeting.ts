import { isScheduleActive } from "@/lib/announcements/shared";
import type {
  AnnouncementRecord,
  AnnouncementUserContext,
} from "@/lib/announcements/types";

export function matchesAudience(
  record: AnnouncementRecord,
  ctx: AnnouncementUserContext,
): boolean {
  const userType = record.audience.userType ?? "all";
  if (userType !== "all" && userType !== ctx.userType) return false;

  const behaviors = record.audience.behavior ?? [];
  if (behaviors.length > 0) {
    const userBehaviors = new Set(ctx.behaviors ?? []);
    const hasBehavior = behaviors.some((b) => userBehaviors.has(b));
    if (!hasBehavior) return false;
  }

  if (record.audience.location && ctx.page !== "all") {
    /* location reserved for future geo targeting */
  }

  return true;
}

export function matchesPage(
  record: AnnouncementRecord,
  page: AnnouncementUserContext["page"],
): boolean {
  const pages = record.target_pages;
  if (pages.includes("all")) return true;
  return pages.includes(page);
}

export function filterAnnouncementsForContext(
  records: AnnouncementRecord[],
  ctx: AnnouncementUserContext,
  options?: { type?: AnnouncementRecord["type"]; now?: Date },
): AnnouncementRecord[] {
  const now = options?.now ?? new Date();
  return records
    .filter((record) => {
      if (options?.type && record.type !== options.type) return false;
      if (!isScheduleActive(record, now)) return false;
      if (!matchesPage(record, ctx.page)) return false;
      if (!matchesAudience(record, ctx)) return false;
      return true;
    })
    .sort((a, b) => b.priority - a.priority);
}

export function pickAbVariant(record: AnnouncementRecord): string | undefined {
  if (!record.ab_test?.enabled || !record.ab_test.variants.length) return undefined;
  const variants = record.ab_test.variants;
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight ?? 1), 0);
  let roll = Math.random() * totalWeight;
  for (const variant of variants) {
    roll -= variant.weight ?? 1;
    if (roll <= 0) return variant.key;
  }
  return variants[0]?.key;
}
