import { NextResponse } from "next/server";
import { getPublicStoreFlags } from "@/lib/store/owner-flags-server";

export const revalidate = 30;

export async function GET() {
  try {
    const flags = await getPublicStoreFlags();
    return NextResponse.json(
      { flags },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("[API] /api/store/flags error:", error);
    // Return default flags on error to prevent app crash
    return NextResponse.json(
      { flags: { high_contrast_mode: false, maintenance_mode: false, beta_features: false } },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
