import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/supabase-auth";
import { ensureDbUserForSupabase, isSupabaseAdminConfigured } from "@/lib/db/ensure-db-user";
import { bilingualError } from "@/lib/validations";

export async function POST() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ...bilingualError("Database not configured", "قاعدة البيانات غير مضبوطة"), error_code: "SUPABASE_ADMIN_UNAVAILABLE" },
      { status: 503 },
    );
  }
  const row = await ensureDbUserForSupabase(
    user.id,
    user.email ?? "",
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    user.user_metadata?.avatar_url ?? null,
  );
  if (!row) {
    return NextResponse.json(
      { ...bilingualError("Could not provision user", "تعذّر تهيئة المستخدم"), error_code: "ENSURE_DB_USER_FAILED" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, profile: row });
}
