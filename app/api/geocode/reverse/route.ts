import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lon") ?? req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ar,en");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "CookieBite/1.0 (address-picker; https://cookie-bite.com)",
        Accept: "application/json",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Reverse geocoder unavailable" }, { status: 502 });
    }
    const raw = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };

    const addr = raw.address ?? {};
    const street =
      addr.road ??
      addr.pedestrian ??
      addr.footway ??
      addr.neighbourhood ??
      addr.suburb ??
      null;
    const city = addr.city ?? addr.town ?? addr.village ?? addr.state_district ?? null;
    const governorate = addr.state ?? addr.region ?? null;

    return NextResponse.json({
      label: raw.display_name ?? null,
      street,
      city,
      governorate,
    });
  } catch (e) {
    console.error("[geocode/reverse]", e);
    return NextResponse.json({ error: "Reverse failed" }, { status: 500 });
  }
}
