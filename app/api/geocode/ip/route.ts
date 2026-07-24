import { NextResponse } from "next/server";
import { CAIRO_MAP_CENTER } from "@/lib/map/leaflet-cdn";

type IpWhoResponse = {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
};

/** موقع تقريبي من عنوان IP (بدون إذن GPS) — للتوجيه الأولي على الخريطة */
export async function GET() {
  try {
    const res = await fetch("https://ipwho.is/", {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("ipwho unavailable");
    const data = (await res.json()) as IpWhoResponse;
    const lat = Number(data.latitude);
    const lng = Number(data.longitude);
    if (!data.success || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error("invalid ip geo payload");
    }
    const parts = [data.city, data.region, data.country].filter(Boolean);
    return NextResponse.json({
      lat,
      lng,
      label: parts.join(", ") || "موقعك التقريبي",
      source: "ip" as const,
    });
  } catch (e) {
    console.error("[geocode/ip]", e);
    return NextResponse.json({
      lat: CAIRO_MAP_CENTER[0],
      lng: CAIRO_MAP_CENTER[1],
      label: "القاهرة الجديدة (افتراضي)",
      source: "fallback" as const,
    });
  }
}
