/**
 * Background worker process - runs separately from the web server.
 * Start with: node worker.mjs
 * Or use PM2 ecosystem for supervision.
 */
import { registerBackgroundWorkers } from "./lib/background/worker-scheduler.js";

console.info("[cookie-bite-worker] Starting background workers...");

try {
  registerBackgroundWorkers();
  console.info("[cookie-bite-worker] Background workers registered successfully");
  
  // Keep the process alive
  process.on("SIGTERM", () => {
    console.info("[cookie-bite-worker] Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });
  
  process.on("SIGINT", () => {
    console.info("[cookie-bite-worker] Received SIGINT, shutting down gracefully");
    process.exit(0);
  });
} catch (err) {
  console.error("[cookie-bite-worker] Failed to start background workers:", err);
  process.exit(1);
}
