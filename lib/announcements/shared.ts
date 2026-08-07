import type {
  AnnouncementAbTest,
  AnnouncementAudience,
  AnnouncementFrequency,
  AnnouncementMetrics,
  AnnouncementRecord,
  AnnouncementStatus,
  AnnouncementTrigger,
  AnnouncementType,
  AnnouncementView,
  InlineVariant,
  TargetPage,
} from "@/lib/announcements/types";

export const ANNOUNCEMENTS_CACHE_TAG = "store-announcements";
export const ANNOUNCEMENTS_CHANGED_EVENT = "cookiebite:announcements-changed";

/** Banners (marquee ticker) must always show — no per-session cooldown. */
export function defaultFrequencyForType(type: AnnouncementType): AnnouncementFrequency {
  if (type === "banner") {
    return { perSession: false, cooldownHours: 0, untilInteract: false };
  }
  return { perSession: true, cooldownHours: 24, untilInteract: false };
}

export const ANNOUNCEMENT_TYPES: AnnouncementType[] = [
  "banner",
  "popup",
  "notification",
  "inline",
  "system",
];

export const TARGET_PAGES: TargetPage[] = [
  "all",
  "home",
  "shop",
  "product",
  "account",
];

export function resolvePageFromPath(pathname: string): TargetPage {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/shop") || pathname.startsWith("/our-cookies")) return "shop";
  if (pathname.startsWith("/product") || pathname.includes("/products/")) return "product";
  return "all";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeAudience(raw: unknown): AnnouncementAudience {
  const obj = asRecord(raw);
  const userType = obj.userType;
  return {
    userType:
      userType === "guest" ||
      userType === "logged_in" ||
      userType === "premium" ||
      userType === "staff" ||
      userType === "all"
        ? userType
        : "all",
    location: typeof obj.location === "string" ? obj.location : null,
    behavior: Array.isArray(obj.behavior)
      ? obj.behavior.filter((b): b is string => typeof b === "string")
      : [],
  };
}

export function normalizeTrigger(raw: unknown): AnnouncementTrigger {
  const obj = asRecord(raw);
  const type = obj.type;
  const valid =
    type === "immediate" ||
    type === "delay" ||
    type === "scroll" ||
    type === "exit_intent" ||
    type === "event";
  return {
    type: valid ? type : "immediate",
    value:
      typeof obj.value === "number" || typeof obj.value === "string"
        ? obj.value
        : undefined,
  };
}

export function normalizeFrequency(raw: unknown): AnnouncementFrequency {
  const obj = asRecord(raw);
  return {
    perSession: typeof obj.perSession === "boolean" ? obj.perSession : true,
    cooldownHours:
      typeof obj.cooldownHours === "number" ? obj.cooldownHours : 24,
    untilInteract:
      typeof obj.untilInteract === "boolean" ? obj.untilInteract : false,
  };
}

export function normalizeMetrics(raw: unknown): AnnouncementMetrics {
  const obj = asRecord(raw);
  return {
    impressions: typeof obj.impressions === "number" ? obj.impressions : 0,
    clicks: typeof obj.clicks === "number" ? obj.clicks : 0,
    dismissals: typeof obj.dismissals === "number" ? obj.dismissals : 0,
  };
}

export function normalizeAbTest(raw: unknown): AnnouncementAbTest | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as AnnouncementAbTest;
  if (!obj.enabled || !Array.isArray(obj.variants) || obj.variants.length === 0) {
    return null;
  }
  return obj;
}

export function normalizeAnnouncementRow(row: Record<string, unknown>): AnnouncementRecord {
  const targetPages = Array.isArray(row.target_pages)
    ? row.target_pages.filter((p): p is TargetPage =>
        TARGET_PAGES.includes(p as TargetPage),
      )
    : ["all"];

  const variant = row.variant;
  const inlineVariant: InlineVariant | null =
    variant === "success" ||
    variant === "warning" ||
    variant === "error" ||
    variant === "info"
      ? variant
      : null;

  const status = row.status;
  const announcementStatus: AnnouncementStatus =
    status === "active" ||
    status === "scheduled" ||
    status === "expired" ||
    status === "draft"
      ? status
      : "draft";

  const type = row.type;
  const announcementType: AnnouncementType = ANNOUNCEMENT_TYPES.includes(
    type as AnnouncementType,
  )
    ? (type as AnnouncementType)
    : "banner";

  return {
    id: String(row.id),
    type: announcementType,
    title_en: String(row.title_en ?? ""),
    title_ar: String(row.title_ar ?? ""),
    message_en: String(row.message_en ?? ""),
    message_ar: String(row.message_ar ?? ""),
    cta_label_en: row.cta_label_en ? String(row.cta_label_en) : null,
    cta_label_ar: row.cta_label_ar ? String(row.cta_label_ar) : null,
    cta_url: row.cta_url ? String(row.cta_url) : null,
    priority: typeof row.priority === "number" ? row.priority : 50,
    status: announcementStatus,
    start_at: row.start_at ? String(row.start_at) : null,
    end_at: row.end_at ? String(row.end_at) : null,
    target_pages: (targetPages.length ? targetPages : ["all"]) as TargetPage[],
    audience: normalizeAudience(row.audience),
    trigger_config: normalizeTrigger(row.trigger_config),
    frequency: normalizeFrequency(row.frequency),
    dismissible: row.dismissible !== false,
    variant: inlineVariant,
    design: asRecord(row.design),
    ab_test: normalizeAbTest(row.ab_test),
    metrics: normalizeMetrics(row.metrics),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    created_by: row.created_by ? String(row.created_by) : null,
  };
}

export function personalizeText(
  text: string,
  ctx: { userName?: string | null },
): string {
  if (!ctx.userName) return text;
  return text
    .replace(/\{name\}/gi, ctx.userName)
    .replace(/\{user\}/gi, ctx.userName);
}

export function toAnnouncementView(
  record: AnnouncementRecord,
  lang: "en" | "ar",
  ctx?: { userName?: string | null; abVariantKey?: string },
): AnnouncementView {
  let title = lang === "ar" ? record.title_ar : record.title_en;
  let message = lang === "ar" ? record.message_ar : record.message_en;
  let ctaLabel = lang === "ar" ? record.cta_label_ar : record.cta_label_en;

  if (record.ab_test?.enabled && ctx?.abVariantKey) {
    const variant = record.ab_test.variants.find((v) => v.key === ctx.abVariantKey);
    if (variant) {
      title = lang === "ar" ? variant.title_ar ?? title : variant.title_en ?? title;
      message =
        lang === "ar" ? variant.message_ar ?? message : variant.message_en ?? message;
      ctaLabel =
        lang === "ar"
          ? variant.cta_label_ar ?? ctaLabel
          : variant.cta_label_en ?? ctaLabel;
    }
  }

  title = personalizeText(title, ctx ?? {});
  message = personalizeText(message, ctx ?? {});

  return {
    id: record.id,
    type: record.type,
    title,
    message,
    cta:
      ctaLabel && record.cta_url
        ? { label: ctaLabel, url: record.cta_url }
        : null,
    priority: record.priority,
    dismissible: record.dismissible,
    variant: record.variant,
    trigger: record.trigger_config,
    frequency: record.frequency,
    targetPages: record.target_pages,
    audience: record.audience,
    abVariantKey: ctx?.abVariantKey,
  };
}

export function isScheduleActive(
  record: AnnouncementRecord,
  now = new Date(),
): boolean {
  if (record.status === "draft" || record.status === "expired") return false;
  const ts = now.getTime();
  if (record.start_at && new Date(record.start_at).getTime() > ts) return false;
  if (record.end_at && new Date(record.end_at).getTime() < ts) return false;
  return record.status === "active" || record.status === "scheduled";
}
