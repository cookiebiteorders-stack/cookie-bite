import type { ShippingZoneRow } from "@/lib/shipping/types";
import { filterEgyptCities } from "@/lib/shipping/egypt-cities";

export type MapSearchResult = {
  id: string;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  kind: "place" | "zone" | "city";
  zoneId?: string;
};

export function searchShippingZones(
  zones: ShippingZoneRow[],
  geoStore: Record<string, { lat: number; lng: number }>,
  query: string,
  limit = 6,
): MapSearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];

  const out: MapSearchResult[] = [];
  for (const zone of zones) {
    const nameMatch = zone.name.toLowerCase().includes(q);
    const cityMatch = (zone.cities ?? []).some((c) =>
      c.toLowerCase().includes(q),
    );
    if (!nameMatch && !cityMatch) continue;
    const geo = geoStore[zone.id];
    out.push({
      id: `zone-${zone.id}`,
      label: zone.name,
      sublabel: geo
        ? `${zone.cities?.slice(0, 2).join(", ") || "—"} · على الخريطة`
        : (zone.cities ?? []).slice(0, 3).join(", ") || "غير موضوعة على الخريطة",
      lat: geo?.lat ?? 30.0444,
      lng: geo?.lng ?? 31.2357,
      kind: "zone",
      zoneId: zone.id,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export function searchEgyptCityHints(query: string, limit = 4): MapSearchResult[] {
  const q = query.trim();
  if (q.length < 2) return [];
  return filterEgyptCities(q, limit).map((city) => ({
    id: `city-${city}`,
    label: city,
    sublabel: "مدينة مصر — ابحث بالاسم ثم اختر نتيجة GPS",
    lat: 30.0444,
    lng: 31.2357,
    kind: "city",
  }));
}

export async function searchPlacesNominatim(
  query: string,
  limit = 8,
): Promise<MapSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: String(Math.min(limit, 10)),
    countrycodes: "eg",
    addressdetails: "1",
  });

  const res = await fetch(`/api/geocode/search?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as {
    results?: Array<{
      place_id?: number;
      lat?: string;
      lon?: string;
      display_name?: string;
      type?: string;
    }>;
  } | null;

  const mapped: MapSearchResult[] = [];
  for (const row of data?.results ?? []) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const label = row.display_name?.split(",").slice(0, 2).join(", ").trim() || q;
    mapped.push({
      id: `osm-${row.place_id ?? `${lat}-${lng}`}`,
      label,
      sublabel: row.display_name ?? undefined,
      lat,
      lng,
      kind: "place",
    });
  }
  return mapped;
}

export async function mergeMapSearch(
  zones: ShippingZoneRow[],
  geoStore: Record<string, { lat: number; lng: number }>,
  query: string,
): Promise<MapSearchResult[]> {
  const zoneHits = searchShippingZones(zones, geoStore, query, 5);
  const cityHits = searchEgyptCityHints(query, 3);
  const placeHits = await searchPlacesNominatim(query, 8);

  const seen = new Set<string>();
  const merged: MapSearchResult[] = [];
  for (const group of [zoneHits, placeHits, cityHits]) {
    for (const item of group) {
      const key = `${item.kind}:${item.label.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 12) return merged;
    }
  }
  return merged;
}

/** Short name for zone form from geocoder label */
export function placeLabelToZoneName(label: string): string {
  const first = label.split(",")[0]?.trim();
  return first.length >= 2 ? first.slice(0, 80) : label.slice(0, 80);
}
