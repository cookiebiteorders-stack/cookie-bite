import { NextResponse } from "next/server";
import { getPublicStoreFlags } from "@/lib/store/owner-flags-server";

export const revalidate = 30;

export async function GET() {
  const flags = await getPublicStoreFlags();
  return NextResponse.json(
    { flags },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    },
  );
}
