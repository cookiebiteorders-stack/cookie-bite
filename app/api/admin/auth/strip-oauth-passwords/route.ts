import { NextResponse } from "next/server";
import { requireOwnerAccess } from "@/lib/admin/require-admin";
import { bulkStripOAuthTempPasswords } from "@/lib/auth/strip-oauth-password";
import { bilingualError } from "@/lib/validations";

/** Owner only — يزيل كلمات المرور المؤقتة من حسابات OAuth في Clerk. */
export async function POST() {
  await requireOwnerAccess("settings");

  try {
    const report = await bulkStripOAuthTempPasswords(500);
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "strip failed";
    console.error("[strip-oauth-passwords]", err);
    return NextResponse.json(
      {
        ...bilingualError("Could not strip OAuth passwords", "تعذّر إزالة كلمات المرور المؤقتة"),
        details: message,
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
