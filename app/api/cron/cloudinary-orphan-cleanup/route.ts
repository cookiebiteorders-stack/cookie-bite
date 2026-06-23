import { NextRequest, NextResponse } from "next/server";
import { verifyInternalSecret } from "@/lib/auth/verify-internal";
import { writeSystemAudit } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runCloudinaryOrphanCleanup } from "@/lib/cloudinary/orphan-cleanup";
import { bilingualError } from "@/lib/validations";

/**
 * POST /api/cron/cloudinary-orphan-cleanup
 * Deletes Cloudinary assets under cookie-bite/ not linked to any product (14+ days old).
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalSecret(req)) {
    return NextResponse.json(bilingualError("Forbidden", "ممنوع"), { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const result = await runCloudinaryOrphanCleanup(supabase);

  await writeSystemAudit("cloudinary.orphan_cleanup", "media", {
    metadata: { ...result, source: "cron" },
  });

  return NextResponse.json({ ok: true, ...result });
}
