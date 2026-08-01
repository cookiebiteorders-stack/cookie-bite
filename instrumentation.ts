/**
 * Runs once when the Node server starts (production / standalone).
 * Background workers now run in a separate process (worker.mjs) for better supervision.
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import('./sentry.edge.config');
    return;
  }
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Initialize Sentry for Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  // Workers are now in a separate supervised process (worker.mjs)
  // This prevents blocking the web server and allows independent scaling
  console.info("[instrumentation] Background workers disabled in web process - use worker.mjs");
}

export const onRequestError = Sentry.captureRequestError;
