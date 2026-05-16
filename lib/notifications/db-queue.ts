import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DispatchOptions } from "@/lib/notifications/orchestrator";

export type NotificationJobType = "order_confirmation" | "payment_confirmation";

export async function enqueueNotificationJob(params: {
  jobType: NotificationJobType;
  orderId: string;
  options?: DispatchOptions;
}): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return null;
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_jobs")
    .insert({
      job_type: params.jobType,
      order_id: params.orderId,
      payload: { force: Boolean(params.options?.force) },
      status: "pending",
    })
    .select("id")
    .single();
  if (error) {
    console.error("[notification_jobs] enqueue", error.message);
    return null;
  }
  return data?.id as string;
}

export async function claimPendingNotificationJobs(limit = 10) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return [];
  }
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notification_jobs")
    .select("id, job_type, order_id, payload, attempts, max_attempts")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return [];

  const claimed: typeof data = [];
  for (const row of data) {
    const { data: updated } = await supabase
      .from("notification_jobs")
      .update({ status: "processing", attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id, job_type, order_id, payload, attempts, max_attempts")
      .maybeSingle();
    if (updated) claimed.push(updated);
  }
  return claimed;
}

export async function completeNotificationJob(
  id: string,
  ok: boolean,
  errorMessage?: string,
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return;
  const supabase = createSupabaseAdminClient();
  const { data: row } = await supabase
    .from("notification_jobs")
    .select("attempts, max_attempts")
    .eq("id", id)
    .maybeSingle();

  const attempts = Number(row?.attempts ?? 1);
  const maxAttempts = Number(row?.max_attempts ?? 3);
  const failed = !ok && attempts < maxAttempts;

  await supabase
    .from("notification_jobs")
    .update({
      status: ok ? "completed" : failed ? "pending" : "failed",
      error_message: errorMessage ?? null,
      processed_at: ok ? new Date().toISOString() : null,
      scheduled_at: failed
        ? new Date(Date.now() + attempts * 60_000).toISOString()
        : new Date().toISOString(),
    })
    .eq("id", id);
}
