import { NextResponse } from "next/server";
import { requireOwnerAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

/** This endpoint is no longer needed with Supabase Auth. */
export async function POST() {
  await requireOwnerAccess("settings");

  return NextResponse.json(
    {
      ...bilingualError(
        "This endpoint is deprecated with Supabase Auth migration",
        "هذا النقطة الطرفية لم تعد مستخدمة بعد الترحيل إلى Supabase Auth"
      ),
    },
    { status: 501 },
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;
