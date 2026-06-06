/**
 * Fallback background workers via localhost cron routes.
 * Used when Next.js instrumentation hook does not run (some Hostinger setups).
 */
export function startBackgroundWorkersLoopback() {
  if (process.env.BACKGROUND_WORKERS_ENABLED === "false") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.BACKGROUND_WORKERS_LOOPBACK === "false") return;

  const secret = process.env.INTERNAL_API_SECRET?.trim();
  if (!secret) {
    console.warn("[background-loopback] skipped — INTERNAL_API_SECRET missing");
    return;
  }

  const port = Number(process.env.PORT) || 3000;
  const base = `http://127.0.0.1:${port}`;
  const bootstrapMs = Number(process.env.BACKGROUND_WORKER_BOOTSTRAP_MS) || 25_000;

  const jobs = [
    { path: "/api/cron/notification-jobs?limit=25", ms: Number(process.env.BACKGROUND_WORKER_NOTIFICATION_MS) || 300_000 },
    { path: "/api/cron/email-worker?limit=25", ms: Number(process.env.BACKGROUND_WORKER_EMAIL_MS) || 300_000 },
    { path: "/api/cron/email-health", ms: Number(process.env.BACKGROUND_WORKER_HEALTH_MS) || 600_000 },
    { path: "/api/cron/abandoned-cart-reminders", ms: Number(process.env.BACKGROUND_WORKER_ABANDONED_MS) || 3_600_000 },
  ];

  setTimeout(() => {
    if (globalThis.__cookieBiteBgWorkersStarted) {
      console.info("[background-loopback] skipped — in-process scheduler already active");
      return;
    }

    globalThis.__cookieBiteBgWorkersLoopback = true;
    console.info("[background-loopback] starting cron loopback workers");

    for (const [index, job] of jobs.entries()) {
      const stagger = index * 30_000;
      const tick = () => {
        fetch(`${base}${job.path}`, {
          method: "POST",
          headers: { "x-internal-secret": secret },
        }).catch((err) => console.error("[background-loopback]", job.path, err));
      };
      setTimeout(() => {
        tick();
        setInterval(tick, job.ms);
      }, stagger);
    }
  }, bootstrapMs);
}
