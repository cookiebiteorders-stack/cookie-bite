import {
  searchEgyptCityHints,
  searchPlacesNominatim,
  type MapSearchResult,
} from "@/lib/map/geocode-search";

/** بحث عناوين العملاء — أماكن OSM + تلميحات مدن مصر */
export async function searchCustomerAddressPlaces(
  query: string,
): Promise<MapSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const [places, cities] = await Promise.all([
    searchPlacesNominatim(trimmed, 10),
    Promise.resolve(searchEgyptCityHints(trimmed, 4)),
  ]);

  const seen = new Set<string>();
  const merged: MapSearchResult[] = [];
  for (const item of [...places, ...cities]) {
    const key = `${item.kind}:${item.label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= 12) break;
  }
  return merged;
}

/** عند اختيار تلميح مدينة بدون إحداثيات — نحلّ الاسم عبر Nominatim */
export async function resolveCityHintToPlace(
  cityLabel: string,
): Promise<MapSearchResult | null> {
  const hits = await searchPlacesNominatim(`${cityLabel}, Egypt`, 3);
  return hits[0] ?? null;
}
