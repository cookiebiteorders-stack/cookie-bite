const STORAGE_KEY = "cb-recently-viewed-v1";
const MAX_ITEMS = 8;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type RecentlyViewedEntry = {
  slug: string;
  name: string;
  image: string;
  price: number;
  productUuid?: string;
  viewedAt: number;
};

function readAll(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed
      .filter(
        (e): e is RecentlyViewedEntry =>
          Boolean(e && typeof e === "object") &&
          typeof (e as RecentlyViewedEntry).slug === "string" &&
          typeof (e as RecentlyViewedEntry).name === "string" &&
          typeof (e as RecentlyViewedEntry).viewedAt === "number" &&
          (e as RecentlyViewedEntry).viewedAt >= cutoff,
      )
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function writeAll(entries: RecentlyViewedEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
  } catch {
    /* quota */
  }
}

export function recordRecentlyViewed(entry: Omit<RecentlyViewedEntry, "viewedAt">): void {
  const list = readAll().filter((e) => e.slug !== entry.slug);
  list.unshift({ ...entry, viewedAt: Date.now() });
  writeAll(list);
}

export function getRecentlyViewed(): RecentlyViewedEntry[] {
  return readAll();
}
