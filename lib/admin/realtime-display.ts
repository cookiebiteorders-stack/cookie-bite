export type AppLang = "ar" | "en";

const CAIRO_TZ = "Africa/Cairo";

export function formatRealtimeTimestamp(
  value: string | number | Date | null | undefined,
  lang: AppLang,
): string {
  if (value == null) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    timeZone: CAIRO_TZ,
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

export function formatRelativeAgo(
  value: string | number | Date | null | undefined,
  lang: AppLang,
  now = Date.now(),
): string {
  if (value == null) return "—";
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const diff = Math.max(0, now - ms);
  const secs = Math.round(diff / 1000);
  if (secs < 60) return lang === "ar" ? `منذ ${secs} ث` : `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return lang === "ar" ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return lang === "ar" ? `منذ ${hours} س` : `${hours}h ago`;
}

export function formatDurationSeconds(seconds: number, lang: AppLang): string {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return lang === "ar" ? `${safe} ث` : `${safe}s`;
  const mins = Math.floor(safe / 60);
  if (mins < 60) return lang === "ar" ? `${mins} د` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (lang === "ar") return rem ? `${hours} س ${rem} د` : `${hours} س`;
  return rem ? `${hours}h ${rem}m` : `${hours}h`;
}
