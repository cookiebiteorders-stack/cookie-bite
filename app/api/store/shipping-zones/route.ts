import { NextResponse } from "next/server";
import { getPublicShippingZones } from "@/lib/shipping/public-zones-server";

export const revalidate = 60;

export async function GET() {
  try {
    const zones = await getPublicShippingZones();
    return NextResponse.json(
      { zones },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[API] /api/store/shipping-zones error:", error);
    // Return empty zones on error to prevent app crash
    return NextResponse.json(
      { zones: [] },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
