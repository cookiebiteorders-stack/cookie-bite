import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncContactToResend } from "@/lib/email/resend-contacts";
import { isEmailConfigured } from "@/lib/email/resend";
import { bilingualError } from "@/lib/validations";

const BATCH = 40;

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("customers");
  requireWritePermission(actor);

  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("profiles")
    .select("email,full_name")
    .eq("role", "customer")
    .order("updated_at", { ascending: false })
    .limit(3000);

  if (error) {
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), { status: 500 });
  }

  let resendSynced = 0;
  let resendFailed = 0;
  const emails = (rows ?? []).map((r) => String(r.email ?? "").trim().toLowerCase()).filter(Boolean);

  if (isEmailConfigured()) {
    for (let i = 0; i < emails.length; i += BATCH) {
      const chunk = emails.slice(i, i + BATCH);
      await Promise.all(
        chunk.map(async (email) => {
          const row = (rows ?? []).find((r) => String(r.email).toLowerCase() === email);
          const sync = await syncContactToResend({
            email,
            firstName: typeof row?.full_name === "string" ? row.full_name.split(/\s+/)[0] : undefined,
            unsubscribed: false,
            source: "crm_sync",
          });
          if (sync.ok) resendSynced += 1;
          else resendFailed += 1;
        }),
      );
    }
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "customers.sync",
    module: "customers",
    metadata: {
      customers: emails.length,
      resendSynced,
      resendFailed,
      resendConfigured: isEmailConfigured(),
    },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    customers: emails.length,
    resendSynced,
    resendFailed,
    resendConfigured: isEmailConfigured(),
    message: {
      en: `Synced ${emails.length} customer records${isEmailConfigured() ? `; ${resendSynced} Resend contacts updated` : " (Resend not configured)"}.`,
      ar: `تمت مزامنة ${emails.length} عميل${isEmailConfigured() ? ` — ${resendSynced} جهة اتصال في Resend` : " (Resend غير مفعّل)"}.`,
    },
  });
}
