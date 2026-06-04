import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { ORDER_LIFECYCLE_RETENTION_DAYS } from "@/lib/orders/order-lifecycle";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  event_type: z.enum(["created", "deleted", "all"]).optional().default("all"),
  order_id: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  await requireAdminAccess("orders");
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid query", "استعلام غير صالح"), { status: 400 });
  }

  const { page, limit, event_type, order_id } = parsed.data;
  const supabase = createSupabaseAdminClient();
  const offset = (page - 1) * limit;

  let q = supabase
    .from("order_lifecycle_events")
    .select(
      "id, event_type, order_id, order_ref, payload, actor_email, actor_role, created_at, expires_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (event_type !== "all") q = q.eq("event_type", event_type);
  if (order_id) q = q.eq("order_id", order_id);

  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) {
    console.error("[admin/orders/lifecycle-history]", error);
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), {
      status: 500,
    });
  }

  const events = (data ?? []).map((row) => {
    const payload = (row.payload ?? {}) as {
      order?: { total_egp?: number; payment_status?: string; status?: string };
      invoices?: unknown[];
      payments?: unknown[];
      items?: unknown[];
    };
    return {
      id: row.id,
      event_type: row.event_type,
      order_id: row.order_id,
      order_ref: row.order_ref,
      actor_email: row.actor_email,
      actor_role: row.actor_role,
      created_at: row.created_at,
      expires_at: row.expires_at,
      total_egp: payload.order?.total_egp ?? null,
      order_status: payload.order?.status ?? null,
      payment_status: payload.order?.payment_status ?? null,
      items_count: Array.isArray(payload.items) ? payload.items.length : 0,
      invoices_count: Array.isArray(payload.invoices) ? payload.invoices.length : 0,
      payments_count: Array.isArray(payload.payments) ? payload.payments.length : 0,
      immutable: true,
    };
  });

  return NextResponse.json({
    events,
    total: count ?? 0,
    page,
    limit,
    retention_days: ORDER_LIFECYCLE_RETENTION_DAYS,
    note_ar:
      "السجل للقراءة فقط ولا يُحذف يدوياً — يُزال تلقائياً بعد 30 يوماً من تاريخ الحدث.",
    note_en: "Read-only history; auto-purged 30 days after each event.",
  });
}
