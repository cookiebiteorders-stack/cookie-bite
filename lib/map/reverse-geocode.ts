export type ReverseGeocodeResult = {
  label: string | null;
  street: string | null;
  city: string | null;
  governorate: string | null;
};

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
  });
  const res = await fetch(`/api/geocode/reverse?${params.toString()}`);
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as ReverseGeocodeResult | null;
  return data;
}

export type IpGeolocationResult = {
  lat: number;
  lng: number;
  label: string;
  source: "ip" | "fallback";
};

export async function fetchIpGeolocation(): Promise<IpGeolocationResult> {
  const res = await fetch("/api/geocode/ip");
  const data = (await res.json().catch(() => null)) as IpGeolocationResult | null;
  if (!data || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) {
    return {
      lat: 30.0444,
      lng: 31.2357,
      label: "القاهرة الجديدة",
      source: "fallback",
    };
  }
  return data;
}
