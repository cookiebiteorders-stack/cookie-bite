import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusEmail } from "@/lib/email/send";
import { bilingualError } from "@/lib/validations";

const schema = z.object({
  order_id: z.string().uuid(),
  status: z.string().min(2).max(64),
  message: z.string().min(2).max(500),
});

export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), {
      status: 403,
    });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_code, order_number, guest_email, user_id")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json(
      bilingualError("Order not found", "الطلب غير موجود"),
      { status: 404 },
    );
  }

  let toEmail = order.guest_email ?? "";
  if (order.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    toEmail = user?.email ?? toEmail;
  }
  if (!toEmail) {
    return NextResponse.json(
      bilingualError("No recipient email", "لا يوجد بريد مستلم"),
      { status: 400 },
    );
  }

  await sendOrderStatusEmail({
    to: toEmail,
    payload: {
      orderId: order.order_code ?? String(order.order_number),
      status: parsed.data.status,
      message: parsed.data.message,
    },
  });

  return NextResponse.json({ ok: true });
}
