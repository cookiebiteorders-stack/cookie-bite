import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const QuerySchema = z.object({
  order: z.string().min(1),
  email: z.string().email(),
});

/**
 * Public order tracking — requires matching guest email (no auth).
 */
export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    order: req.nextUrl.searchParams.get("order")?.trim(),
    email: req.nextUrl.searchParams.get("email")?.trim().toLowerCase(),
  });

  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "استعلام غير صالح"), {
      status: 400,
    });
  }

  if (!process.env.SUPABASE_SERVICE_KEY) {
    return NextResponse.json(bilingualError("Unavailable", "غير متاح"), { status: 503 });
  }

  const orderKey = parsed.data.order.replace(/^#/, "");
  const supabase = createSupabaseAdminClient();

  const orderNumber = Number(orderKey);
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, order_code, status, payment_status, payment_method, total_egp, created_at, updated_at, guest_email, user_id, shipping_address",
    );

  if (Number.isFinite(orderNumber) && orderNumber > 0) {
    query = query.eq("order_number", orderNumber);
  } else {
    query = query.eq("order_code", orderKey);
  }

  const { data: order, error } = await query.maybeSingle();
  if (error || !order) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), {
      status: 404,
    });
  }

  let email = (order.guest_email as string | null)?.toLowerCase() ?? "";
  if (order.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    email = user?.email?.toLowerCase() ?? email;
  }

  if (email !== parsed.data.email) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), {
      status: 404,
    });
  }

  const ship = (order.shipping_address ?? {}) as Record<string, unknown>;
  const tracking =
    typeof ship.tracking_number === "string" ? ship.tracking_number : null;
  const courier = typeof ship.courier === "string" ? ship.courier : null;

  return NextResponse.json({
    ok: true,
    order: {
      order_number: order.order_number,
      order_code: order.order_code ?? `#${order.order_number}`,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      total_egp: order.total_egp,
      created_at: order.created_at,
      updated_at: order.updated_at,
      tracking_number: tracking,
      courier,
      recipient_name: typeof ship.name === "string" ? ship.name : null,
      city: typeof ship.city === "string" ? ship.city : null,
    },
  });
}
