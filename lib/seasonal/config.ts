export type SeasonId = "default" | "ramadan" | "eid-fitr" | "eid-adha";

export type SeasonWindow = {
  id: Exclude<SeasonId, "default">;
  /** inclusive YYYY-MM-DD */
  start: string;
  /** inclusive YYYY-MM-DD */
  end: string;
};

/** حدّث التواريخ سنوياً — تقديرية حسب التقويم الهجري */
export const SEASON_WINDOWS: SeasonWindow[] = [
  { id: "ramadan", start: "2026-02-18", end: "2026-03-19" },
  { id: "eid-fitr", start: "2026-03-20", end: "2026-03-25" },
  { id: "eid-adha", start: "2026-05-27", end: "2026-06-01" },
  { id: "ramadan", start: "2027-02-08", end: "2027-03-09" },
  { id: "eid-fitr", start: "2027-03-10", end: "2027-03-14" },
];

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function resolveActiveSeason(at: Date = new Date()): SeasonId {
  const forced = process.env.NEXT_PUBLIC_FORCE_SEASON?.trim() as SeasonId | undefined;
  if (forced && ["ramadan", "eid-fitr", "eid-adha", "default"].includes(forced)) {
    return forced;
  }

  const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  for (const window of SEASON_WINDOWS) {
    const start = parseYmd(window.start);
    const end = parseYmd(window.end);
    if (day >= start && day <= end) return window.id;
  }
  return "default";
}
