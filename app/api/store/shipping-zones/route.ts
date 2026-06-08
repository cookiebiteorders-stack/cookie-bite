import { NextResponse } from "next/server";
import { getPublicShippingZones } from "@/lib/shipping/public-zones-server";

export const revalidate = 60;

export async function GET() {
  const zones = await getPublicShippingZones();
  return NextResponse.json(
    { zones },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
