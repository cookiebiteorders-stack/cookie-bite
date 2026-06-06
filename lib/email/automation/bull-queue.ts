import "@/lib/server-only";

const QUEUE_NAME = "cookie-bite-email";

let queuePromise: Promise<import("bullmq").Queue<{ queueId: string }> | null> | null = null;

async function getQueue(): Promise<import("bullmq").Queue<{ queueId: string }> | null> {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return null;
  if (!queuePromise) {
    queuePromise = (async () => {
      const { Queue } = await import("bullmq");
      return new Queue<{ queueId: string }>(QUEUE_NAME, { connection: { url: redisUrl } });
    })();
  }
  return queuePromise;
}

export async function addEmailBullJob(queueId: string): Promise<boolean> {
  const queue = await getQueue();
  if (!queue) return false;
  await queue.add(
    "send",
    { queueId },
    {
      jobId: queueId,
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    },
  );
  return true;
}

export async function removeEmailBullJob(queueId: string): Promise<void> {
  const queue = await getQueue();
  if (!queue) return;
  try {
    const job = await queue.getJob(queueId);
    if (job) await job.remove();
  } catch {
    /* job may already be gone */
  }
}

export async function drainEmailBullJobs(max = 15): Promise<number> {
  const queue = await getQueue();
  if (!queue) return 0;
  const { processEmailQueueRow } = await import("@/lib/email/automation/process-job");
  const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");

  const waiting = await queue.getJobs(["waiting", "delayed", "failed"], 0, max - 1);
  let done = 0;
  const supabase = createSupabaseAdminClient();

  for (const job of waiting) {
    try {
      const { data: row } = await supabase
        .from("email_queue")
        .select("*")
        .eq("id", job.data.queueId)
        .maybeSingle();
      if (row) await processEmailQueueRow(row);
      await job.remove();
      done += 1;
    } catch (e) {
      console.error("[email-bull] job failed", job.id, e);
    }
  }
  return done;
}
