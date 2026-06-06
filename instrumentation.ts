/**
 * Runs once when the Node server starts (production / standalone).
 * Starts in-process background workers — no Hostinger cron required.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { registerBackgroundWorkers } = await import("@/lib/background/worker-scheduler");
  registerBackgroundWorkers();
}
