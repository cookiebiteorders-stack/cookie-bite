"use client";

import { useEffect } from "react";
import { logStructuredError } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

/**
 * خطأ الجذر — يجب أن يتضمن html و body كاملين (Next.js App Router).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logStructuredError("global-error", error, { digest: error.digest });
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem" }}>حدث خطأ حرج / Critical error</h1>
        <p style={{ opacity: 0.8 }}>
          Reload the application. If this persists, check server logs.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            borderRadius: "0.75rem",
            border: "1px solid #ccc",
            background: "#a85c3c",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          إعادة المحاولة / Retry
        </button>
      </body>
    </html>
  );
}
