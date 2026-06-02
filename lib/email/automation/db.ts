import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmailCategory, EmailProviderId, EmailQueueStatus } from "@/lib/email/automation/types";
import type { SendEmailPayload } from "@/lib/email/automation/types";

export async function insertEmailQueue(payload: SendEmailPayload & { priority?: number }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_queue")
    .insert({
      status: "pending" as EmailQueueStatus,
      email_type: payload.emailType ?? "transactional",
      template_key: payload.templateKey ?? null,
      recipient: payload.to,
      subject: payload.subject,
      html_body: payload.html,
      text_body: payload.text ?? null,
      variables: payload.variables ?? {},
      metadata: payload.metadata ?? {},
      order_id: payload.orderId ?? null,
      user_id: payload.userId ?? null,
      priority: payload.priority ?? 5,
      max_attempts: 5,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateQueueStatus(
  id: string,
  patch: Partial<{
    status: EmailQueueStatus;
    provider: string;
    provider_message_id: string;
    attempts: number;
    sent_at: string;
    error_summary: string;
    next_retry_at: string;
  }>,
) {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("email_queue")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function writeEmailLog(params: {
  queueId?: string | null;
  recipient: string;
  subject: string;
  emailType: string;
  templateKey?: string | null;
  userId?: string | null;
  provider: string;
  providerMessageId?: string | null;
  status: "sent" | "delivered" | "bounced" | "complained" | "failed";
  orderId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("email_logs").insert({
    queue_id: params.queueId ?? null,
    recipient: params.recipient,
    subject: params.subject,
    email_type: params.emailType,
    template_key: params.templateKey ?? null,
    user_id: params.userId ?? null,
    provider: params.provider,
    provider_message_id: params.providerMessageId ?? null,
    status: params.status,
    order_id: params.orderId ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function writeFailedEmail(params: {
  queueId?: string | null;
  recipient: string;
  subject: string;
  provider?: string | null;
  errorMessage: string;
  errorCode?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
  payload?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("failed_emails").insert({
    queue_id: params.queueId ?? null,
    recipient: params.recipient,
    subject: params.subject,
    provider: params.provider ?? null,
    error_message: params.errorMessage,
    error_code: params.errorCode ?? null,
    retry_count: params.retryCount ?? 0,
    next_retry_at: params.nextRetryAt ?? null,
    payload: params.payload ?? {},
  });
}

export async function writeProviderHealth(params: {
  provider: EmailProviderId;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  errorMessage?: string;
  dns?: { spf?: boolean; dkim?: boolean; dmarc?: boolean };
  rateLimited?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("provider_health_logs").insert({
    provider: params.provider,
    status: params.status,
    latency_ms: params.latencyMs ?? null,
    error_message: params.errorMessage ?? null,
    spf_ok: params.dns?.spf ?? null,
    dkim_ok: params.dns?.dkim ?? null,
    dmarc_ok: params.dns?.dmarc ?? null,
    rate_limited: params.rateLimited ?? false,
    metadata: params.metadata ?? {},
  });
}

export async function fetchPendingQueue(limit = 20) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("email_queue")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("scheduled_at", now)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .order("priority", { ascending: true })
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchRetryableFailed(limit = 20) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("failed_emails")
    .select("*")
    .is("resolved_at", null)
    .lte("next_retry_at", now)
    .lt("retry_count", 5)
    .order("next_retry_at", { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getEmailLogIdByQueueId(queueId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_logs")
    .select("id")
    .eq("queue_id", queueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[email-automation] could not fetch email log by queue id", queueId, error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

export async function switchActiveProvider(provider: EmailProviderId) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase.from("email_provider_settings").select("id").limit(1).maybeSingle();
  if (!data?.id) return;
  await supabase
    .from("email_provider_settings")
    .update({ active_provider: provider, updated_at: new Date().toISOString() })
    .eq("id", data.id);
}
