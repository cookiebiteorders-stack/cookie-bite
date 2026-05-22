import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { syncContactToResend } from "@/lib/email/resend-contacts";
import { bilingualError } from "@/lib/validations";

const bodySchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
  source: z.string().max(80).optional().default("csv_import"),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("customers");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const unique = [...new Set(parsed.data.emails.map((e) => e.toLowerCase()))];
  let upserted = 0;
  let failed = 0;
  let resendSynced = 0;

  for (const email of unique) {
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      { email, source: parsed.data.source, is_active: true },
      { onConflict: "email" },
    );
    if (error) failed += 1;
    else {
      upserted += 1;
      const sync = await syncContactToResend({
        email,
        unsubscribed: false,
        source: parsed.data.source,
      });
      if (sync.ok) resendSynced += 1;
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.import_newsletter",
    module: "customers",
    metadata: { rows: unique.length, upserted, failed, resendSynced },
    request: req,
  });

  return NextResponse.json({
    ok: failed === 0,
    processed: unique.length,
    upserted,
    failed,
    resendSynced,
    note: "Emails merged into newsletter_subscribers; synced to Resend contacts when API key is set.",
  });
}
