import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireFullPermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { setProviderPriority } from "@/lib/email/automation/self-heal";
import type { EmailProviderId } from "@/lib/email/automation/types";
import { bilingualError } from "@/lib/validations";

const patchSchema = z.object({
  active_provider: z.string().optional(),
  provider_priority: z.array(z.string()).optional(),
  auto_fallback_enabled: z.boolean().optional(),
  self_heal_enabled: z.boolean().optional(),
  test_recipient: z.string().email().optional().nullable(),
  rate_limit_per_minute: z.number().int().min(1).max(500).optional(),
});

export async function GET() {
  await requireAdminAccess("settings");
  try {
    const supabase = createSupabaseAdminClient();
    const [settings, smtp] = await Promise.all([
      supabase.from("email_provider_settings").select("*").limit(1).maybeSingle(),
      supabase.from("smtp_configs").select("id,name,host,port,from_email,is_active,is_default,last_verified_at").order("created_at"),
    ]);
    return NextResponse.json({
      ok: true,
      settings: settings.data,
      smtp: smtp.data ?? [],
      env: {
        resend: Boolean(process.env.RESEND_API_KEY),
        smtp: Boolean(process.env.SMTP_HOST),
        sendgrid: Boolean(process.env.SENDGRID_API_KEY),
        mailgun: Boolean(process.env.MAILGUN_API_KEY),
        redis: Boolean(process.env.REDIS_URL),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireFullPermission(actor);
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), { status: 400 });
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data: row } = await supabase.from("email_provider_settings").select("id").limit(1).maybeSingle();
    if (!row?.id) {
      return NextResponse.json(bilingualError("Settings not found", "الإعدادات غير موجودة"), { status: 404 });
    }
    await supabase
      .from("email_provider_settings")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (parsed.data.provider_priority) {
      await setProviderPriority(
        parsed.data.provider_priority as EmailProviderId[],
        parsed.data.active_provider as EmailProviderId | undefined,
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}
