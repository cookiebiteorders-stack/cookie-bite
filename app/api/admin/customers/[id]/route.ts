import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertCustomerModerationAllowed,
  deleteCustomerAccount,
  loadCustomerModerationTarget,
} from "@/lib/admin/customer-moderation";
import {
  requireAdminAccess,
  requireFullPermission,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { getBlockedEmail } from "@/lib/db/blocked-emails";
import { bilingualError } from "@/lib/validations";
import type { AdminCustomerRow, AddressRow, OrderSummaryRow } from "@/lib/admin/crm-types";

function tierFromPoints(points: number): AdminCustomerRow["loyalty_tier"] {
  if (points >= 3000) return "platinum";
  if (points >= 1500) return "gold";
  if (points >= 600) return "silver";
  return "bronze";
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminAccess("customers");
  const { id } = await ctx.params;
  const supabase = createSupabaseAdminClient();

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("id,email,full_name,avatar_url,points,created_at,updated_at,supabase_user_id,role")
    .eq("id", id)
    .eq("role", "customer")
    .maybeSingle();

  if (userErr || !user) {
    return NextResponse.json(bilingualError("Customer not found", "العميل غير موجود"), { status: 404 });
  }

  const [{ data: orders }, { data: sums }, { count: orderCount }, { data: addresses }, notesRes] =
    await Promise.all([
    supabase
      .from("orders")
      .select("id,order_code,total_egp,status,payment_status,created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase.from("orders").select("total_egp,created_at").eq("user_id", id).limit(5000),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", id),
    supabase
      .from("addresses")
      .select("id,label,recipient,phone,street,city,governorate,is_default")
      .eq("user_id", id)
      .order("is_default", { ascending: false }),
    supabase.from("customer_admin_notes").select("body").eq("user_id", id).maybeSingle(),
  ]);

  const admin_notes =
    notesRes.error || !notesRes.data
      ? ""
      : typeof (notesRes.data as { body?: string }).body === "string"
        ? (notesRes.data as { body: string }).body
        : "";

  const orderRows = (orders ?? []) as OrderSummaryRow[];
  let totalSpent = 0;
  let lastOrderAt: string | null = null;
  for (const r of sums ?? []) {
    const row = r as { total_egp?: number; created_at?: string };
    totalSpent += Number(row.total_egp ?? 0);
    const c = row.created_at;
    if (c && (!lastOrderAt || c > lastOrderAt)) lastOrderAt = c;
  }

  const customer: AdminCustomerRow = {
    id: user.id as string,
    email: user.email as string,
    full_name: (user.full_name as string | null) ?? null,
    avatar_url: (user.avatar_url as string | null) ?? null,
    points: user.points as number,
    created_at: user.created_at as string,
    updated_at: (user.updated_at as string | null) ?? null,
    total_orders: orderCount ?? 0,
    total_spent_egp: totalSpent,
    last_order_at: lastOrderAt,
    loyalty_tier: tierFromPoints(user.points as number),
  };

  const blocked = await getBlockedEmail(user.email as string);

  return NextResponse.json({
    customer: { ...customer, supabase_user_id: user.supabase_user_id as string },
    orders: orderRows,
    addresses: (addresses ?? []) as AddressRow[],
    admin_notes,
    email_blocked: Boolean(blocked),
    blocked_reason: blocked?.reason ?? null,
    blocked_at: blocked?.blocked_at ?? null,
  });
}

const patchSchema = z
  .object({
    full_name: z.string().min(1).max(160).optional(),
    points: z.number().int().min(0).max(2_000_000).optional(),
    admin_notes: z.string().max(8000).optional(),
  })
  .refine(
    (d) => d.full_name !== undefined || d.points !== undefined || d.admin_notes !== undefined,
    { message: "empty patch" },
  );

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminAccess("customers");
  requireWritePermission(actor);

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const { id } = await ctx.params;
  const patch: Record<string, unknown> = {};
  if (parsed.data.full_name !== undefined) patch.full_name = parsed.data.full_name.trim();
  if (parsed.data.points !== undefined) patch.points = parsed.data.points;

  const supabase = createSupabaseAdminClient();

  const { data: exists } = await supabase.from("users").select("id").eq("id", id).eq("role", "customer").maybeSingle();
  if (!exists) {
    return NextResponse.json(bilingualError("Customer not found", "العميل غير موجود"), { status: 404 });
  }

  const { data: before } = await supabase.from("users").select("*").eq("id", id).maybeSingle();

  if (Object.keys(patch).length > 0) {
    const { data: updated, error } = await supabase.from("users").update(patch).eq("id", id).select("*").single();
    if (error || !updated) {
      return NextResponse.json(bilingualError("Failed to update customer", "فشل تحديث العميل"), { status: 500 });
    }
  }

  if (parsed.data.admin_notes !== undefined) {
    const { error: noteErr } = await supabase.from("customer_admin_notes").upsert(
      {
        user_id: id,
        body: parsed.data.admin_notes,
        updated_at: new Date().toISOString(),
        updated_by_email: actor.email ?? "",
      },
      { onConflict: "user_id" },
    );
    if (noteErr) {
      return NextResponse.json(bilingualError("Failed to save CRM notes", "فشل حفظ الملاحظات"), { status: 500 });
    }
  }

  const { data: finalRow } = await supabase.from("users").select("*").eq("id", id).maybeSingle();

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action:
      parsed.data.admin_notes !== undefined && Object.keys(patch).length === 0
        ? "customers.update_notes"
        : "customers.update",
    module: "customers",
    entity_id: id,
    before: before ?? null,
    after: finalRow ?? before ?? null,
    metadata: { patch, admin_notes_updated: parsed.data.admin_notes !== undefined },
    request: req,
  });

  return NextResponse.json({ ok: true, customer: finalRow });
}

const deleteSchema = z.object({
  reason: z.string().max(500).optional(),
  confirm_email: z.string().email(),
});

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireAdminAccess("customers");
  requireFullPermission(actor);

  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(bilingualError("Invalid customer id", "معرّف العميل غير صالح"), {
      status: 400,
    });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const target = await loadCustomerModerationTarget(id);
  if (!target) {
    return NextResponse.json(bilingualError("Customer not found", "العميل غير موجود"), { status: 404 });
  }

  const denied = assertCustomerModerationAllowed(target, actor);
  if (denied) return denied;

  if (parsed.data.confirm_email.trim().toLowerCase() !== target.email.trim().toLowerCase()) {
    return NextResponse.json(
      bilingualError(
        "Confirmation email does not match",
        "البريد التأكيدي لا يطابق بريد العميل",
      ),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("users").select("*").eq("id", id).maybeSingle();

  const result = await deleteCustomerAccount({ target });

  if (!result.ok) {
    return NextResponse.json(bilingualError(result.message.en, result.message.ar), { status: 500 });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.delete",
    module: "customers",
    entity_id: id,
    before: before ?? null,
    after: null,
    metadata: { email: target.email, reason: parsed.data.reason ?? null },
    request: req,
  });

  return NextResponse.json({ ok: true, deleted: true, email_blocked: false });
}
