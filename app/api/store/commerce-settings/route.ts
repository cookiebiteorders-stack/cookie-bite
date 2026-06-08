import { NextResponse } from "next/server";
import { getPublicCommerceSettings } from "@/lib/store/commerce-settings-server";

export const revalidate = 60;

export async function GET() {
  const settings = await getPublicCommerceSettings();
  return NextResponse.json(
    { settings },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
