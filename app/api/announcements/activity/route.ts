import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

const CITIES = ["New Cairo", "Fifth Settlement", "Madinaty", "Rehab", "التجمع الخامس", "مدينتي"];

export async function GET() {
  const supabase = createSupabaseAdminClient();
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("created_at, shipping_city")
    .eq("payment_status", "paid")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({ activities: [] });
  }

  const activities = (data ?? []).map((row, index) => {
    const city =
      (row.shipping_city as string | null) ||
      CITIES[index % CITIES.length];
    const minutesAgo = Math.max(
      1,
      Math.round((Date.now() - new Date(String(row.created_at)).getTime()) / 60_000),
    );
    return {
      id: `act_${index}_${row.created_at}`,
      city,
      minutesAgo,
    };
  });

  return NextResponse.json(
    { activities },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
