import { NextRequest, NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(10, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 8)));

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL(NOMINATIM);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "eg");
  url.searchParams.set("addressdetails", "1");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "CookieBite/1.0 (shipping-zones; https://cookie-bite.com)",
        Accept: "application/json",
        "Accept-Language": "en,ar",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { results: [], error: "Geocoder unavailable" },
        { status: 502 },
      );
    }

    const raw = (await res.json()) as unknown;
    const rows = Array.isArray(raw) ? raw : [];

    const results = rows
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const lat = Number(r.lat);
        const lng = Number(r.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          place_id: r.place_id,
          lat: String(lat),
          lon: String(lng),
          display_name: typeof r.display_name === "string" ? r.display_name : "",
          type: typeof r.type === "string" ? r.type : undefined,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ results });
  } catch (e) {
    console.error("[geocode/search]", e);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}
