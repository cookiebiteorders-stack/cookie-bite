/**
 * Per-zone geographic metadata (lat / lng / radius / color) stored client-side.
 *
 * Until we add geo columns to the `shipping_zones` table, we cache the visual
 * map placement in localStorage keyed by zone id. The map UI gracefully treats
 * a zone with no geo entry as "needs placement on the map".
 */

export type ZoneGeo = {
  lat: number;
  lng: number;
  radiusKm: number;
  color: string;
};

const STORAGE_KEY = "cb.shipping.zone-geo.v1";

const DEFAULT_PALETTE = [
  "#FF6B00",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
];

export const ZONE_GEO_PALETTE = DEFAULT_PALETTE;

type GeoStore = Record<string, ZoneGeo>;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadZoneGeoStore(): GeoStore {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const store: GeoStore = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Partial<ZoneGeo>;
      if (
        typeof v.lat === "number" &&
        typeof v.lng === "number" &&
        Number.isFinite(v.lat) &&
        Number.isFinite(v.lng)
      ) {
        store[id] = {
          lat: v.lat,
          lng: v.lng,
          radiusKm: Number(v.radiusKm) > 0 ? Number(v.radiusKm) : 5,
          color: typeof v.color === "string" ? v.color : DEFAULT_PALETTE[0],
        };
      }
    }
    return store;
  } catch {
    return {};
  }
}

export function saveZoneGeo(id: string, geo: ZoneGeo): void {
  if (!isBrowser() || !id) return;
  try {
    const store = loadZoneGeoStore();
    store[id] = geo;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage may be full or blocked — silently ignore.
  }
}

export function deleteZoneGeo(id: string): void {
  if (!isBrowser() || !id) return;
  try {
    const store = loadZoneGeoStore();
    if (!(id in store)) return;
    delete store[id];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getZoneGeo(id: string): ZoneGeo | null {
  if (!isBrowser() || !id) return null;
  const store = loadZoneGeoStore();
  return store[id] ?? null;
}

/** Pick the next palette color that's not yet used among the provided zones. */
export function pickNextColor(usedColors: string[]): string {
  for (const c of DEFAULT_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)];
}
