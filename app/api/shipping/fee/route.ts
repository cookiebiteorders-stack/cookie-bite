import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/site-config";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";

/**
 * GET /api/shipping/fee
 * 
 * Returns delivery fee based on city/governorate from shipping_zones table.
 * Falls back to standard delivery fee if no zone matches.
 * 
 * Query params:
 * - city: The city name (e.g., "Cairo", "Alexandria")
 * - governorate: The governorate name (optional, overrides city if provided)
 * 
 * Response:
 * {
 *   fee: number,
 *   free_threshold: number,
 *   zone_name: string | null
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const city = searchParams.get("city");
    const governorate = searchParams.get("governorate");

    // Default fallback values
    const defaultFee = siteConfig.standardDeliveryFeeEgp;
    const freeThreshold = await getFreeShippingThresholdEgp();

    // If no location provided, return default
    if (!city && !governorate) {
      return NextResponse.json({
        fee: defaultFee,
        free_threshold: freeThreshold,
        zone_name: null,
      });
    }

    const supabase = createSupabaseAdminClient();
    
    // Try to find matching shipping zone
    // Priority: governorate > city
    const location = governorate || city;
    
    if (location) {
      const { data: zone } = await supabase
        .from("shipping_zones")
        .select("name, base_fee_egp, free_shipping_threshold_egp")
        .eq("is_active", true)
        .contains("cities", [location])
        .maybeSingle();

      if (zone) {
        return NextResponse.json({
          fee: Number(zone.base_fee_egp),
          free_threshold: zone.free_shipping_threshold_egp !== null 
            ? Number(zone.free_shipping_threshold_egp) 
            : freeThreshold,
          zone_name: zone.name,
        });
      }
    }

    // No matching zone found, return default
    return NextResponse.json({
      fee: defaultFee,
      free_threshold: freeThreshold,
      zone_name: null,
    });

  } catch (error) {
    console.error("[Shipping Fee API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping fee" },
      { status: 500 }
    );
  }
}
