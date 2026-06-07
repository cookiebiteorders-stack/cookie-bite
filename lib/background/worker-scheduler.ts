import { runAutomationJob } from "@/lib/admin/automation/run-job";
import type { AutomationJobId } from "@/lib/admin/automation/registry";
import { countPendingEmailQueue } from "@/lib/email/automation/db";

declare global {
  // eslint-disable-next-line no-var
  var __cookieBiteBgWorkersStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __cookieBiteBgWorkersLoopback: boolean | undefined;
}

type JobSchedule = {
  id: AutomationJobId;
  intervalMs: number;
  limit: number;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function resolveSchedules(): JobSchedule[] {
  return [
    {
      id: "notification_jobs",
      intervalMs: parsePositiveInt(process.env.BACKGROUND_WORKER_NOTIFICATION_MS, 5 * 60_000),
      limit: parsePositiveInt(process.env.BACKGROUND_WORKER_NOTIFICATION_LIMIT, 25),
    },
    {
      id: "email_worker",
      intervalMs: parsePositiveInt(process.env.BACKGROUND_WORKER_EMAIL_MS, 5 * 60_000),
      limit: parsePositiveInt(process.env.BACKGROUND_WORKER_EMAIL_LIMIT, 25),
    },
    {
      id: "email_health",
      intervalMs: parsePositiveInt(process.env.BACKGROUND_WORKER_HEALTH_MS, 10 * 60_000),
      limit: parsePositiveInt(process.env.BACKGROUND_WORKER_HEALTH_LIMIT, 25),
    },
    {
      id: "abandoned_cart",
      intervalMs: parsePositiveInt(process.env.BACKGROUND_WORKER_ABANDONED_MS, 60 * 60_000),
      limit: parsePositiveInt(process.env.BACKGROUND_WORKER_ABANDONED_LIMIT, 50),
    },
    {
      id: "product_catalog",
      intervalMs: parsePositiveInt(process.env.BACKGROUND_WORKER_CATALOG_MS, 15 * 60_000),
      limit: 1,
    },
  ];
}

let started = false;
const running = new Set<AutomationJobId>();
const lastRunAt: Partial<Record<AutomationJobId, string>> = {};
const lastResult: Partial<Record<AutomationJobId, string>> = {};

export function isBackgroundWorkersEnabled(): boolean {
  if (process.env.BACKGROUND_WORKERS_ENABLED === "false") return false;
  if (process.env.BACKGROUND_WORKERS_ENABLED === "true") return true;
  return process.env.NODE_ENV === "production";
}

export function getBackgroundWorkerStatus() {
  return {
    enabled: isBackgroundWorkersEnabled(),
    started,
    loopback: Boolean(globalThis.__cookieBiteBgWorkersLoopback),
    schedules: resolveSchedules().map((s) => ({
      id: s.id,
      intervalMs: s.intervalMs,
      limit: s.limit,
      lastRunAt: lastRunAt[s.id] ?? null,
      lastResult: lastResult[s.id] ?? null,
      running: running.has(s.id),
    })),
  };
}

async function runJobSafe(schedule: JobSchedule): Promise<void> {
  if (running.has(schedule.id)) return;
  running.add(schedule.id);
  try {
    const result = await runAutomationJob(schedule.id, schedule.limit);
    lastRunAt[schedule.id] = new Date().toISOString();
    lastResult[schedule.id] = JSON.stringify(result).slice(0, 400);
    console.info(`[background-workers] ${schedule.id} ok`, lastResult[schedule.id]);

    if (schedule.id === "email_worker") {
      const backlog = await countPendingEmailQueue().catch(() => 0);
      if (backlog > 0) {
        setTimeout(() => void runJobSafe(schedule), 60_000);
      }
    }
  } catch (error) {
    console.error(`[background-workers] ${schedule.id} failed`, error);
  } finally {
    running.delete(schedule.id);
  }
}

/**
 * In-process scheduler — runs automation jobs without Hostinger cron or admin clicks.
 * Starts once per Node process (instrumentation hook / server boot).
 */
export function registerBackgroundWorkers(): void {
  if (started) return;
  if (typeof window !== "undefined") return;
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (!isBackgroundWorkersEnabled()) return;
  if (!process.env.SUPABASE_SERVICE_KEY?.trim()) {
    console.warn("[background-workers] skipped — SUPABASE_SERVICE_KEY missing");
    return;
  }

  started = true;
  globalThis.__cookieBiteBgWorkersStarted = true;
  const schedules = resolveSchedules();
  const bootstrapDelayMs = parsePositiveInt(process.env.BACKGROUND_WORKER_BOOTSTRAP_MS, 15_000);

  console.info(
    "[background-workers] scheduler active:",
    schedules.map((s) => `${s.id}@${Math.round(s.intervalMs / 1000)}s`).join(", "),
  );

  // First drain shortly after boot (orders/emails queued during deploy).
  setTimeout(() => {
    void Promise.all(schedules.map((schedule) => runJobSafe(schedule)));
  }, bootstrapDelayMs);

  // Stagger recurring timers so jobs don't hammer the DB at the same instant.
  schedules.forEach((schedule, index) => {
    const staggerMs = index * 30_000;
    setTimeout(() => {
      void runJobSafe(schedule);
      setInterval(() => void runJobSafe(schedule), schedule.intervalMs);
    }, bootstrapDelayMs + staggerMs);
  });
}
