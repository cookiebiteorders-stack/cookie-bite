/**
 * Per-zone geographic metadata for the delivery map.
 * Primary source: `shipping_zones` columns (center_lat, center_lng, radius_km, map_color).
 * Legacy fallback: localStorage (`cb.shipping.zone-geo.v1`) for zones saved before DB geo.
 */

import type { ShippingZoneRow } from "@/lib/shipping/types";

export type ZoneGeo = {
  lat: number;
  lng: number;
  radiusKm: number;
  color: string;
};

const STORAGE_KEY = "cb.shipping.zone-geo.v1";

/** ألوان المناطق — تبدأ من ألوان العلامة ثم درجات متنوعة بصرياً */
const DEFAULT_PALETTE = [
  "#e8782a",
  "#84441b",
  "#3d9a72",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#dd8447",
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

export function geoFromZoneRow(zone: ShippingZoneRow): ZoneGeo | null {
  const lat = zone.center_lat;
  const lng = zone.center_lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const radiusKm =
    zone.radius_km != null && Number(zone.radius_km) > 0 ? Number(zone.radius_km) : 5;
  return {
    lat,
    lng,
    radiusKm,
    color:
      typeof zone.map_color === "string" && zone.map_color.length > 0
        ? zone.map_color
        : DEFAULT_PALETTE[0],
  };
}

/** DB fields for create/update API payloads */
export function geoToDbFields(geo: ZoneGeo) {
  return {
    center_lat: geo.lat,
    center_lng: geo.lng,
    radius_km: geo.radiusKm,
    map_color: geo.color,
  };
}

export function clearGeoDbFields() {
  return {
    center_lat: null,
    center_lng: null,
    radius_km: null,
    map_color: null,
  };
}

/** Merge DB geo (wins) with legacy localStorage entries */
export function buildZoneGeoIndex(zones: ShippingZoneRow[]): GeoStore {
  const store: GeoStore = isBrowser() ? { ...loadZoneGeoStore() } : {};
  for (const zone of zones) {
    const fromDb = geoFromZoneRow(zone);
    if (fromDb) store[zone.id] = fromDb;
  }
  return store;
}

export function resolveZoneGeo(
  zone: ShippingZoneRow,
  legacyStore?: GeoStore,
): ZoneGeo | null {
  return geoFromZoneRow(zone) ?? legacyStore?.[zone.id] ?? getZoneGeo(zone.id);
}

/** Pick the next palette color that's not yet used among the provided zones. */
export function pickNextColor(usedColors: string[]): string {
  for (const c of DEFAULT_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return DEFAULT_PALETTE[Math.floor(Math.random() * DEFAULT_PALETTE.length)];
}
