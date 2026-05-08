import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { sendOrderConfirmation } from "@/lib/email/send";
import { bilingualError } from "@/lib/validations";

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), {
      status: 403,
    });
  }

  const body = (await req.json().catch(() => null)) as { order_id?: string } | null;
  if (!body?.order_id) {
    return NextResponse.json(
      bilingualError("Missing order_id", "معرّف الطلب مفقود"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_code, order_number, total_egp, language, guest_email, user_id")
    .eq("id", body.order_id)
    .maybeSingle();
  if (error || !order) {
    return NextResponse.json(
      bilingualError("Order not found", "الطلب غير موجود"),
      { status: 404 },
    );
  }

  let toEmail: string | null = order.guest_email ?? null;
  let name = "Customer";
  if (order.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", order.user_id)
      .maybeSingle();
    toEmail = user?.email ?? toEmail;
    name = user?.full_name ?? name;
  }
  if (!toEmail) {
    return NextResponse.json(
      bilingualError("No recipient email", "لا يوجد بريد مستلم"),
      { status: 400 },
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, quantity, unit_price_egp, total_price_egp")
    .eq("order_id", order.id);

  const itemsHtml = (items ?? [])
    .map((i) => {
      const lineTotal = i.total_price_egp ?? i.unit_price_egp * i.quantity;
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #F2DDC5">${i.product_name} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #F2DDC5;text-align:right">${lineTotal.toFixed(2)} EGP</td></tr>`;
    })
    .join("");

  await sendOrderConfirmation({
    to: toEmail,
    payload: {
      name,
      orderId: order.order_code ?? String(order.order_number),
      total: order.total_egp,
      itemsHtml,
    },
  });

  return NextResponse.json({ ok: true });
}
