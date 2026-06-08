import { NextResponse } from "next/server";
import { getPublicBusinessSettings } from "@/lib/store/business-settings-server";

export const revalidate = 60;

export async function GET() {
  const settings = await getPublicBusinessSettings();
  return NextResponse.json(
    { settings },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
