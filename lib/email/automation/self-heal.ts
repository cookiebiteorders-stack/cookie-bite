import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { drainEmailBullJobs } from "@/lib/email/automation/bull-queue";
import { drainEmailQueue } from "@/lib/email/automation/pipeline";
import { fetchRetryableFailed } from "@/lib/email/automation/db";
import { processEmailQueueRow } from "@/lib/email/automation/process-job";
import { runFullHealthCycle } from "@/lib/email/automation/health-monitor";
import { switchActiveProvider } from "@/lib/email/automation/db";
import type { EmailProviderId } from "@/lib/email/automation/types";

export async function requeueFailedEmails(max = 25): Promise<number> {
  const { isSmartRetriesEnabled } = await import("@/lib/store/owner-flags-server");
  if (!(await isSmartRetriesEnabled())) return 0;

  const supabase = createSupabaseAdminClient();
  const failed = await fetchRetryableFailed(max);
  let requeued = 0;

  for (const f of failed) {
    const payload = (f.payload as Record<string, unknown>) ?? {};
    const { data: row, error } = await supabase
      .from("email_queue")
      .insert({
        status: "pending",
        recipient: f.recipient,
        subject: f.subject,
        html_body: (payload.html as string) ?? "<p>Retry</p>",
        email_type: "transactional",
        scheduled_at: new Date().toISOString(),
        metadata: { retry_from_failed_id: f.id },
      })
      .select("id")
      .single();

    if (!error && row?.id) {
      await supabase
        .from("failed_emails")
        .update({
          retry_count: ((f.retry_count as number) ?? 0) + 1,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", f.id);
      requeued += 1;
    }
  }
  return requeued;
}

export async function runSelfHealCycle(): Promise<{
  health: Awaited<ReturnType<typeof runFullHealthCycle>>;
  dbProcessed: number;
  bullProcessed: number;
  requeued: number;
}> {
  const health = await runFullHealthCycle();

  if (health.switchedTo) {
    console.info("[email-self-heal] switched active provider to", health.switchedTo);
  }

  const [dbProcessed, bullProcessed, requeued] = await Promise.all([
    drainEmailQueue(25),
    drainEmailBullJobs(25),
    requeueFailedEmails(15),
  ]);

  return { health, dbProcessed, bullProcessed, requeued };
}

export async function retryFailedEmailById(failedId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data: f } = await supabase.from("failed_emails").select("*").eq("id", failedId).maybeSingle();
  if (!f) return false;

  const { data: row } = await supabase
    .from("email_queue")
    .select("*")
    .eq("id", f.queue_id)
    .maybeSingle();

  if (row) {
    await supabase
      .from("email_queue")
      .update({
        status: "pending",
        next_retry_at: null,
        scheduled_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    await processEmailQueueRow(row);
    await supabase
      .from("failed_emails")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", failedId);
    return true;
  }

  return false;
}

export async function setProviderPriority(priority: EmailProviderId[], active?: EmailProviderId) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("email_provider_settings").select("id").limit(1).maybeSingle();
  if (!data?.id) return;
  await supabase
    .from("email_provider_settings")
    .update({
      provider_priority: priority,
      ...(active ? { active_provider: active } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
}
