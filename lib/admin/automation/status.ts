import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/email/resend";
import { getIntegrationEnvStatus } from "@/lib/config/production-lock";
import { checkProductionEnv } from "@/lib/config/production-lock";

const EXPECTED_EVENT_MAPPINGS = [
  "user_registered",
  "order_created",
  "order_shipped",
  "password_reset",
] as const;

export async function getAutomationStatus() {
  const supabase = createSupabaseAdminClient();
  const env = checkProductionEnv();
  const integrations = getIntegrationEnvStatus(env);

  const [
    notifPending,
    emailQueuePending,
    failedOpen,
    abandonedR1,
    eventMappings,
    eventLogs24h,
    notifLogsFailed24h,
  ] = await Promise.all([
    supabase
      .from("notification_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]),
    supabase
      .from("failed_emails")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    supabase
      .from("abandoned_carts")
      .select("id", { count: "exact", head: true })
      .eq("is_recovered", false)
      .is("reminder_1_sent_at", null)
      .not("email", "is", null),
    supabase
      .from("email_event_template_mappings")
      .select("event_name, template_key, is_active")
      .in("event_name", [...EXPECTED_EVENT_MAPPINGS]),
    supabase
      .from("email_event_logs")
      .select("status")
      .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()),
    supabase
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()),
  ]);

  const mappings = (eventMappings.data ?? []) as {
    event_name: string;
    template_key: string;
    is_active: boolean;
  }[];

  const mappingIssues: string[] = [];
  for (const event of EXPECTED_EVENT_MAPPINGS) {
    const row = mappings.find((m) => m.event_name === event);
    if (!row?.is_active) mappingIssues.push(`${event}:missing_or_inactive`);
  }

  const logs = eventLogs24h.data ?? [];
  const eventStats = {
    sent: logs.filter((l) => (l as { status: string }).status === "sent").length,
    failed: logs.filter((l) => (l as { status: string }).status === "failed").length,
    skipped: logs.filter((l) => (l as { status: string }).status === "skipped").length,
  };

  return {
    cronConfigured: Boolean(process.env.INTERNAL_API_SECRET?.trim()),
    resendConfigured: isEmailConfigured(),
    redisConfigured: integrations.redis_queue,
    emailAutomationEnabled: process.env.EMAIL_AUTOMATION_ENABLED !== "false",
    queues: {
      notificationJobsPending: notifPending.count ?? 0,
      emailQueuePending: emailQueuePending.count ?? 0,
      failedEmailsOpen: failedOpen.count ?? 0,
      abandonedCartsAwaitingReminder1: abandonedR1.count ?? 0,
    },
    eventMappings: mappings,
    mappingIssues,
    eventLogs24h: eventStats,
    notificationFailures24h: notifLogsFailed24h.count ?? 0,
    envOk: env.ok,
    envWarnings: env.warnings.length,
  };
}
