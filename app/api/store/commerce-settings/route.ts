import { NextResponse } from "next/server";
import { getPublicCommerceSettings } from "@/lib/store/commerce-settings-server";

export const revalidate = 60;

export async function GET() {
  try {
    const settings = await getPublicCommerceSettings();
    return NextResponse.json(
      { settings },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[API] /api/store/commerce-settings error:", error);
    // Return default settings on error to prevent app crash
    return NextResponse.json(
      { settings: { free_shipping_threshold_egp: 500 } },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
