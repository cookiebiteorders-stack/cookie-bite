import { auth } from "@/lib/auth/supabase-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  addressUpsertSchema,
  firstAddressSchemaError,
} from "@/lib/account/address-schema";
import {
  buildAddressUpdateRow,
  clearDefaultAddressesForUser,
  getAddressOwnedByUser,
  normalizeAddressRow,
  updateAddressWithFallback,
} from "@/lib/db/addresses";
import { ensureDbUserForSupabase, isSupabaseAdminConfigured } from "@/lib/db/ensure-db-user";
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

  const existing = await getAddressOwnedByUser(dbUser.id, id);
  if (!existing) {
    return NextResponse.json(
      bilingualError("Address not found", "العنوان غير موجود"),
      { status: 404 },
    );
  }

  const body = parsed.data;
  const lat = body.latitude ?? existing.latitude ?? 30.0444;
  const lng = body.longitude ?? existing.longitude ?? 31.2357;
  const supabase = createSupabaseAdminClient();

  if (body.is_default) {
    await clearDefaultAddressesForUser(supabase, dbUser.id);
  }

  const patch = buildAddressUpdateRow(body, { latitude: lat, longitude: lng });
  const { data, error } = await updateAddressWithFallback(supabase, id, dbUser.id, patch);
  if (error || !data) {
    console.error("PATCH /api/account/addresses/[id]", error);
    return NextResponse.json(
      bilingualError("Could not update address", "تعذّر تحديث العنوان"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, address: normalizeAddressRow(data) });
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

  const existing = await getAddressOwnedByUser(dbUser.id, id);
  if (!existing) {
    return NextResponse.json(
      bilingualError("Address not found", "العنوان غير موجود"),
      { status: 404 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", dbUser.id);

  if (error) {
    console.error("DELETE /api/account/addresses/[id]", error);
    return NextResponse.json(
      bilingualError("Could not delete address", "تعذّر حذف العنوان"),
      { status: 500 },
    );
  }

  if (existing.is_default) {
    const { data: nextDefault } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (nextDefault?.id) {
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", nextDefault.id)
        .eq("user_id", dbUser.id);
    }
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
