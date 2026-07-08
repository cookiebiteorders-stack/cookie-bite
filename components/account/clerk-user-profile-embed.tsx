"use client";

/**
 * Inline password-change panel.
 *
 * Originally this component was a Clerk <UserProfile> embed.
 * The project now uses Supabase Auth, so this is a native replacement
 * that calls supabase.auth.updateUser() directly — the same approach used
 * by the standalone reset-password page.
 */

import { useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AuthInput } from "@/components/auth/auth-input";
import { PasswordRulesHint } from "@/components/auth/password-rules-hint";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

export function ClerkUserProfileEmbed() {
  const formRef = useRef<HTMLFormElement>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (next !== confirm) {
      setStatus("error");
      setMessage("New passwords do not match.");
      return;
    }

    if (next.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setStatus("loading");

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      // Re-authenticate with current password first to verify ownership.
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        setStatus("error");
        setMessage("Session expired — please sign in again.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });

      if (signInError) {
        setStatus("error");
        setMessage("Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: next,
      });

      if (updateError) {
        setStatus("error");
        setMessage(updateError.message);
        return;
      }

      setStatus("success");
      setMessage("Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setStatus("error");
      setMessage("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-cb-border bg-cb-surface p-5"
    >
      <div className="flex items-center gap-2 pb-1">
        <KeyRound className="h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
        <h3 className="text-sm font-semibold text-cb-text-strong">Change Password</h3>
      </div>

      <AuthInput
        label="Current password"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
        autoComplete="current-password"
        placeholder="Enter your current password"
      />

      <AuthInput
        label="New password"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        required
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />

      <AuthInput
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
        placeholder="Repeat new password"
      />

      <PasswordRulesHint containerRef={formRef} variant="settings" />

      {message && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
            status === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300",
          )}
        >
          {status === "success" && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cb-terracotta-dark px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cb-brand-logo disabled:opacity-60"
      >
        {status === "loading" && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        )}
        {status === "loading" ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}
