import { auth } from "@/lib/auth/supabase-auth";
import { upsertUserFromSupabase } from "@/lib/db/users";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { bilingualError } from "@/lib/validations";

/** يولّد username تلقائياً بعد OAuth/تسجيل — ويُنشئ صف المستخدم في Supabase. */
export async function POST() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  try {
    // Create user profile in database
    const dbUser = await upsertUserFromSupabase({
      supabaseUserId: userId,
      email: user.email ?? "",
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    });
    
    return NextResponse.json({
      ok: true,
      db_user: Boolean(dbUser),
    });
  } catch (err) {
    console.error("account provision failed", err);
    return NextResponse.json(
      bilingualError("Provision failed", "تعذّر إعداد الحساب"),
      { status: 500 },
    );
  }
}
