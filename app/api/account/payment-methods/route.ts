import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  firstPaymentMethodSchemaError,
  paymentMethodUpsertSchema,
} from "@/lib/account/payment-method-schema";
import { ensureDbUserForClerk, isSupabaseAdminConfigured } from "@/lib/db/ensure-db-user";
import {
  buildPaymentMethodRow,
  clearDefaultPaymentMethodsForUser,
  countPaymentMethodsForUser,
  listPaymentMethodsForUser,
} from "@/lib/db/payment-methods";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      bilingualError("Database unavailable", "قاعدة البيانات غير متاحة"),
      { status: 503 },
    );
  }

  const dbUser = await ensureDbUserForClerk(userId);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const methods = await listPaymentMethodsForUser(dbUser.id);
  return NextResponse.json({ methods });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      bilingualError("Database unavailable", "قاعدة البيانات غير متاحة"),
      { status: 503 },
    );
  }

  const parsed = paymentMethodUpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const { en, ar } = firstPaymentMethodSchemaError(parsed.error);
    return NextResponse.json({ ...bilingualError(en, ar) }, { status: 400 });
  }

  const dbUser = await ensureDbUserForClerk(userId);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const body = parsed.data;
  const existingCount = await countPaymentMethodsForUser(dbUser.id);
  const makeDefault = body.is_default ?? existingCount === 0;
  const supabase = createSupabaseAdminClient();

  if (makeDefault) {
    await clearDefaultPaymentMethodsForUser(supabase, dbUser.id);
  }

  const row = buildPaymentMethodRow(dbUser.id, body, { isDefault: makeDefault });
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    console.error("POST /api/account/payment-methods", error);
    return NextResponse.json(
      bilingualError("Could not save payment method", "تعذّر حفظ طريقة الدفع"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, method: data }, { status: 201 });
}

export const dynamic = "force-dynamic";
