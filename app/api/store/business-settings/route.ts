import { NextResponse } from "next/server";
import { getPublicBusinessSettings } from "@/lib/store/business-settings-server";

export const revalidate = 60;

export async function GET() {
  try {
    const settings = await getPublicBusinessSettings();
    return NextResponse.json(
      { settings },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[API] /api/store/business-settings error:", error);
    // Return default settings on error to prevent app crash
    return NextResponse.json(
      { settings: { hours_en: "", hours_ar: "" } },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
