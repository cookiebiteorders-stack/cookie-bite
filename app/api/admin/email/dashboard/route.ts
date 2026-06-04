import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/email/resend";
import { isProviderConfigured, loadProviderPriority } from "@/lib/email/automation/provider-registry";
import {
  isEmailDbQueueEnabled,
  isRedisConfigured,
} from "@/lib/email/automation/queue-config";
import { isResendContactsManagementEnabled } from "@/lib/email/resend-errors";
import { bilingualError } from "@/lib/validations";

export async function GET() {
  await requireAdminAccess("settings");
  try {
    const supabase = createSupabaseAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [logs, failed, queue, health, settings] = await Promise.all([
      supabase.from("email_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabase
        .from("failed_emails")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null),
      supabase
        .from("email_queue")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "processing", "failed"]),
      supabase
        .from("provider_health_logs")
        .select("*")
        .order("checked_at", { ascending: false })
        .limit(12),
      supabase.from("email_provider_settings").select("*").limit(1).maybeSingle(),
    ]);

    const sent24h =
      (
        await supabase
          .from("email_logs")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("created_at", since)
      ).count ?? 0;

    const priority = await loadProviderPriority();
    const providers = priority.map((p) => ({
      id: p,
      configured: isProviderConfigured(p),
    }));

    return NextResponse.json({
      ok: true,
      resendConfigured: isEmailConfigured(),
      stats: {
        sent24h,
        logs24h: logs.count ?? 0,
        failedOpen: failed.count ?? 0,
        queuePending: queue.count ?? 0,
      },
      providers,
      settings: settings.data,
      health: health.data ?? [],
      redis: isRedisConfigured(),
      dbQueue: isEmailDbQueueEnabled(),
      contactsManagement: isResendContactsManagementEnabled(),
      automationEnabled: process.env.EMAIL_AUTOMATION_ENABLED !== "false",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "dashboard_failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}
