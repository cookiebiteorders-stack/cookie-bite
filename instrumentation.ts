/**
 * Runs once when the Node server starts (production / standalone).
 * Background workers now run in a separate process (worker.mjs) for better supervision.
 */
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Workers are now in a separate supervised process (worker.mjs)
  // This prevents blocking the web server and allows independent scaling
  console.info("[instrumentation] Background workers disabled in web process - use worker.mjs");
}
