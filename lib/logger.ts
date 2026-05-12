type LogPayload = Record<string, unknown>;

/**
 * Structured logging مستوى خطأ؛ يتجنب رمي أسرار (keys معروفة تُحمّى).
 * اختياري: إرسال نسخة مُعقّمة إلى COOKIE_BITE_LOG_WEBHOOK_URL (HTTPS) لدمجها مع مراقبة مركزية.
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

function forwardToWebhook(payload: Record<string, unknown>) {
  const url = process.env.COOKIE_BITE_LOG_WEBHOOK_URL;
  if (!url || !/^https:\/\//i.test(url)) return;

  const body = JSON.stringify(payload);
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    /* avoid recursive logging */
  });
}

export function logStructuredError(
  scope: string,
  err: unknown,
  context?: LogPayload & { correlationId?: string },
) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  const correlationId =
    context && typeof context.correlationId === "string"
      ? context.correlationId
      : (process.env.COOKIE_BITE_CORRELATION_ID ?? undefined);

  const { correlationId: _strip, ...rest } = (context ?? {}) as LogPayload & {
    correlationId?: string;
  };

  const record = {
    ts: new Date().toISOString(),
    scope,
    message,
    stack,
    service: process.env.COOKIE_BITE_SERVICE_NAME ?? "cookie-bite-web",
    environment: process.env.NODE_ENV ?? "unknown",
    correlationId,
    context: Object.keys(rest).length ? sanitize(rest) : undefined,
  };

  console.error(JSON.stringify(record));
  forwardToWebhook(record);
}
