import { auth } from "@/lib/auth/supabase-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  addressUpsertSchema,
  firstAddressSchemaError,
} from "@/lib/account/address-schema";
import {
  buildAddressInsertRow,
  clearDefaultAddressesForUser,
  countAddressesForUser,
  insertAddressWithFallback,
  listAddressesForUser,
  normalizeAddressRow,
} from "@/lib/db/addresses";
import { ensureDbUserForSupabase, isSupabaseAdminConfigured } from "@/lib/db/ensure-db-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";
import { requireCsrfProtection } from "@/lib/security/csrf";

export async function GET() {
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

  const dbUser = await ensureDbUserForSupabase(userId, user?.email ?? "", user?.user_metadata?.full_name, user?.user_metadata?.avatar_url);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const addresses = await listAddressesForUser(dbUser.id);
  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const { userId, user } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  // Validate CSRF token for state-changing operation
  const csrfCheck = await requireCsrfProtection(req);
  if (!csrfCheck.valid) {
    return NextResponse.json(
      bilingualError(csrfCheck.error || "CSRF validation failed", "فشل التحقق من CSRF"),
      { status: 403 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      bilingualError("Database unavailable", "قاعدة البيانات غير متاحة"),
      { status: 503 },
    );
  }

  const parsed = addressUpsertSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const { en, ar } = firstAddressSchemaError(parsed.error);
    return NextResponse.json({ ...bilingualError(en, ar) }, { status: 400 });
  }

  const dbUser = await ensureDbUserForSupabase(userId, user?.email ?? "", user?.user_metadata?.full_name, user?.user_metadata?.avatar_url);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const body = parsed.data;
  const lat = body.latitude ?? 30.0444;
  const lng = body.longitude ?? 31.2357;
  const existingCount = await countAddressesForUser(dbUser.id);
  const makeDefault = body.is_default ?? existingCount === 0;

  const supabase = createSupabaseAdminClient();
  if (makeDefault) {
    await clearDefaultAddressesForUser(supabase, dbUser.id);
  }

  const addressRow = buildAddressInsertRow(
    dbUser.id,
    body,
    { recipient: body.recipient, phone: body.phone },
    { latitude: lat, longitude: lng },
    { isDefault: makeDefault },
  );

  const { data, error } = await insertAddressWithFallback(supabase, addressRow);
  if (error || !data) {
    console.error("POST /api/account/addresses", error);
    return NextResponse.json(
      bilingualError("Could not save address", "تعذّر حفظ العنوان"),
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, address: normalizeAddressRow(data) },
    { status: 201 },
  );
}

export const dynamic = "force-dynamic";
