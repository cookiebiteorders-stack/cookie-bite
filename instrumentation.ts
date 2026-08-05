/**
 * Runs once when the Node server starts (production / standalone).
 * Background workers now run in a separate process (worker.mjs) for better supervision.
 */
export async function register() {
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Workers are now in a separate supervised process (worker.mjs)
  // This prevents blocking the web server and allows independent scaling
  console.info("[instrumentation] Background workers disabled in web process - use worker.mjs");

  // Initialize cache warming for better performance
  if (process.env.NODE_ENV === "production") {
    try {
      const { scheduleCacheWarming } = await import("@/lib/cache-warming");
      scheduleCacheWarming();
      console.info("[instrumentation] Cache warming scheduled");
    } catch (err) {
      console.warn("[instrumentation] Failed to schedule cache warming", err);
    }
  }
}
