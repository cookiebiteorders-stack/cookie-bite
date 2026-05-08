"use client";

import { Component, type ReactNode } from "react";
import Link from "next/link";
import { logStructuredError } from "@/lib/logger";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = { hasError: boolean; error?: Error };

/**
 * حدود خطأ React لالتقاط الأعطال داخل الأشجار الفرعية دون إسقاط الصفحة كلها.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logStructuredError("ErrorBoundary", error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="mx-auto flex max-w-lg flex-col gap-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-6 text-center">
          <p className="font-serif text-xl font-bold text-cb-text-strong">
            حدث خطأ غير متوقع / Something went wrong
          </p>
          <p className="text-sm text-cb-text-muted">
            جرّب إعادة تحميل الصفحة. إذا استمرت المشكلة، تواصل مع الدعم.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-semibold text-white"
            >
              Try again / حاول مجدداً
            </button>
            <Link
              href="/"
              className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold"
            >
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
