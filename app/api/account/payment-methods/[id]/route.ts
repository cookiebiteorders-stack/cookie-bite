import { auth } from "@/lib/auth/supabase-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  firstPaymentMethodSchemaError,
  paymentMethodUpsertSchema,
} from "@/lib/account/payment-method-schema";
import { ensureDbUserForSupabase, isSupabaseAdminConfigured } from "@/lib/db/ensure-db-user";
import {
  buildPaymentMethodRow,
  clearDefaultPaymentMethodsForUser,
  getPaymentMethodOwnedByUser,
} from "@/lib/db/payment-methods";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { userId, user } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      bilingualError("Database unavailable", "قاعدة البيانات غير متاحة"),
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const parsed = paymentMethodUpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const { en, ar } = firstPaymentMethodSchemaError(parsed.error);
    return NextResponse.json({ ...bilingualError(en, ar) }, { status: 400 });
  }

  const dbUser = await ensureDbUserForSupabase(userId, user?.email ?? "", user?.user_metadata?.full_name, user?.user_metadata?.avatar_url);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const existing = await getPaymentMethodOwnedByUser(dbUser.id, id);
  if (!existing) {
    return NextResponse.json(
      bilingualError("Payment method not found", "طريقة الدفع غير موجودة"),
      { status: 404 },
    );
  }

  const body = parsed.data;
  const supabase = createSupabaseAdminClient();
  if (body.is_default) {
    await clearDefaultPaymentMethodsForUser(supabase, dbUser.id);
  }

  const row = buildPaymentMethodRow(dbUser.id, body, {
    isDefault: body.is_default ?? existing.is_default,
  });
  delete row.user_id;

  const { data, error } = await supabase
    .from("saved_payment_methods")
    .update(row)
    .eq("id", id)
    .eq("user_id", dbUser.id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("PATCH /api/account/payment-methods/[id]", error);
    return NextResponse.json(
      bilingualError("Could not update payment method", "تعذّر تحديث طريقة الدفع"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, method: data });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { userId, user } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      bilingualError("Database unavailable", "قاعدة البيانات غير متاحة"),
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const dbUser = await ensureDbUserForSupabase(userId, user?.email ?? "", user?.user_metadata?.full_name, user?.user_metadata?.avatar_url);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const existing = await getPaymentMethodOwnedByUser(dbUser.id, id);
  if (!existing) {
    return NextResponse.json(
      bilingualError("Payment method not found", "طريقة الدفع غير موجودة"),
      { status: 404 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("saved_payment_methods")
    .delete()
    .eq("id", id)
    .eq("user_id", dbUser.id);

  if (error) {
    console.error("DELETE /api/account/payment-methods/[id]", error);
    return NextResponse.json(
      bilingualError("Could not delete payment method", "تعذّر حذف طريقة الدفع"),
      { status: 500 },
    );
  }

  if (existing.is_default) {
    const { data: nextDefault } = await supabase
      .from("saved_payment_methods")
      .select("id")
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (nextDefault?.id) {
      await supabase
        .from("saved_payment_methods")
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq("id", nextDefault.id)
        .eq("user_id", dbUser.id);
    }
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
