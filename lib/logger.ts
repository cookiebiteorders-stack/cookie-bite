type LogPayload = Record<string, unknown>;

/**
 * Structured logging مستوى خطأ؛ يتجنب رمي أسرار (keys معروفة تُحمّى).
 */

const REDACT_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "token",
  "secret",
  "api_key",
  "apikey",
  "service_role",
]);

function sanitize(obj: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((x) => sanitize(x, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const low = k.toLowerCase();
    if (REDACT_KEYS.has(low) || low.includes("secret") || low.includes("token")) {
      out[k] = "[redacted]";
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  return out;
}

export function logStructuredError(scope: string, err: unknown, context?: LogPayload) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      scope,
      message,
      stack,
      context: context ? sanitize(context) : undefined,
    }),
  );
}
