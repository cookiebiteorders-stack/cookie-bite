"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("auth route error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-cb-cream px-6 text-center">
      <div className="max-w-md space-y-3">
        <h1 className="font-serif text-2xl font-semibold text-cb-text-strong">
          Something went wrong
        </h1>
        <p className="text-sm leading-relaxed text-cb-text-muted">
          We couldn’t load the sign-in experience. Your credentials are safe —
          this is usually a temporary glitch.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-cb-terracotta-dark px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cb-terracotta"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border-2 border-cb-border bg-cb-surface px-5 py-2.5 text-sm font-semibold text-cb-text-strong transition hover:bg-cb-peach/50"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
