import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { sendOrderStatusEmail } from "@/lib/email/send";
import { onOrderShipped } from "@/lib/email/automation/triggers";
import { bilingualError } from "@/lib/validations";
import { writeAuditLog } from "@/lib/admin/audit";
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES } from "@/lib/domain/order-enums";

const schema = z
  .object({
    status: z.enum(ORDER_STATUS_VALUES).optional(),
    payment_status: z.enum(PAYMENT_STATUS_VALUES).optional(),
    note: z.string().max(500).optional(),
    shipping_address: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (d) =>
      Boolean(d.status ?? d.payment_status ?? d.note ?? (d.shipping_address && Object.keys(d.shipping_address).length)),
    { message: "empty patch" },
  );

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminAccess("orders");
  const { id } = await ctx.params;
  const supabase = createSupabaseAdminClient();
  const { data: order, error: orderErr } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (orderErr || !order) {
    return NextResponse.json(bilingualError("Order not found", "الطلب غير موجود"), { status: 404 });
  }
  const { data: items, error: itemsErr } = await supabase.from("order_items").select("*").eq("order_id", id);
  if (itemsErr) {
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), { status: 500 });
  }
  return NextResponse.json({ order, items: items ?? [] });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const actor = await requireAdminAccess("orders");
  requireWritePermission(actor);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const patch: Record<string, unknown> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.payment_status) patch.payment_status = parsed.data.payment_status;
  if (parsed.data.note) patch.notes = parsed.data.note;

  const supabase = createSupabaseAdminClient();

  const { data: before } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (parsed.data.shipping_address && before) {
    const prev =
      before.shipping_address && typeof before.shipping_address === "object" && !Array.isArray(before.shipping_address)
        ? (before.shipping_address as Record<string, unknown>)
        : {};
    patch.shipping_address = { ...prev, ...parsed.data.shipping_address };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !order) {
    return NextResponse.json(
      bilingualError("Failed to update order", "فشل تحديث الطلب"),
      { status: 500 },
    );
  }

  let to = order.guest_email ?? "";
  if (order.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    to = user?.email ?? to;
  }
  if (to && parsed.data.status) {
    if (parsed.data.status === "shipped") {
      try {
        await onOrderShipped({
          email: to,
          userId: order.user_id ?? null,
          orderId: order.order_code ?? String(order.order_number),
        });
      } catch (eventError) {
        console.error("order_shipped email trigger failed", eventError);
      }
    } else {
      await sendOrderStatusEmail({
        to,
        payload: {
          orderId: order.order_code ?? String(order.order_number),
          status: parsed.data.status,
          message: parsed.data.note ?? "Your order status has been updated.",
        },
      });
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: parsed.data.status
      ? "order.update_status"
      : parsed.data.payment_status
        ? "order.update_payment_status"
        : "order.update",
    module: "orders",
    entity_id: id,
    before: before ?? null,
    after: order,
    metadata: {
      patch,
      notified_email: to || null,
    },
    request: req,
  });

  return NextResponse.json({ ok: true, order });
}
