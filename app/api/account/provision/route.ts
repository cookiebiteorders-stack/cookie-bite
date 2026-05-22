import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { provisionClerkUsernameAndPassword } from "@/lib/auth/clerk-provision-credentials";
import { ensureDbUserForClerk } from "@/lib/db/ensure-db-user";
import { bilingualError } from "@/lib/validations";

/** يولّد username تلقائياً بعد OAuth/تسجيل — ويُنشئ صف المستخدم في Supabase. */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  try {
    const result = await provisionClerkUsernameAndPassword(userId);
    const dbUser = await ensureDbUserForClerk(userId);
    return NextResponse.json({
      ok: true,
      username: result.username,
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
