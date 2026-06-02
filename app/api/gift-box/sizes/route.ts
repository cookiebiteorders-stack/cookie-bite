import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_GIFT_BOX_SIZES } from "@/lib/gift-box-builder/sizes";

export const revalidate = 300;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("gift_box_sizes")
      .select("id, code, name, max_items, image_url, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) {
      return NextResponse.json(
        { sizes: DEFAULT_GIFT_BOX_SIZES },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
      );
    }
    return NextResponse.json(
      { sizes: (data ?? []) as typeof DEFAULT_GIFT_BOX_SIZES },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch {
    return NextResponse.json(
      { sizes: DEFAULT_GIFT_BOX_SIZES },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  }
}
