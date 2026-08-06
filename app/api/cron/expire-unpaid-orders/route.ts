import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Cron job to cancel expired unpaid orders and release their stock.
 * This fixes the critical inventory leak where stock is decremented before payment
 * and never released on failure/abandon/expired orders (DB-01).
 * 
 * Paymob intentions expire after 3600s (1 hour), so we cancel unpaid orders
 * older than 1 hour by default.
 * 
 * Security: This endpoint should be protected by cron job authentication
 * (e.g., Vercel Cron Jobs with CRON_SECRET or similar mechanism).
 */
export async function GET(req: Request) {
  // Verify cron secret for security
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  try {
    // Call the RPC function to cancel expired unpaid orders
    const { data, error } = await supabase.rpc("cancel_expired_unpaid_orders", {
      p_hours_ago: 1, // Cancel orders older than 1 hour
    });

    if (error) {
      console.error("Cron: cancel_expired_unpaid_orders error:", error);
      return new Response(`Error: ${error.message}`, { status: 500 });
    }

    const cancelledOrders = data as Array<{
      order_id: string;
      order_code: string;
      cancelled_at: string;
    }>;

    console.log(`Cron: Cancelled ${cancelledOrders.length} expired unpaid orders`, {
      orders: cancelledOrders.map((o) => o.order_code),
    });

    return Response.json({
      success: true,
      cancelled_count: cancelledOrders.length,
      orders: cancelledOrders,
    });
  } catch (err) {
    console.error("Cron: expire-unpaid-orders error:", err);
    return new Response("Internal server error", { status: 500 });
  }
}
