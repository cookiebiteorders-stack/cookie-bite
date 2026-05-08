"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logStructuredError } from "@/lib/logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logStructuredError("app/error", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="font-serif text-2xl font-semibold text-cb-text-strong">
          حدث خطأ / Something went wrong
        </h1>
        <p className="text-sm text-cb-text-muted">
          لم نتمكن من إكمال الطلب. بياناتك آمنة — غالباً هذه مشكلة مؤقتة.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-cb-terracotta-dark px-5 py-2.5 text-sm font-bold text-white"
        >
          إعادة المحاولة / Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border-2 border-cb-border bg-cb-surface px-5 py-2.5 text-sm font-semibold text-cb-text-strong"
        >
          الرئيسية / Home
        </Link>
      </div>
    </div>
  );
}
