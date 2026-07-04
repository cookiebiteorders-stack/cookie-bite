"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthButton } from "@/components/auth/auth-button";
import { CheckCircle } from "lucide-react";

export function SupabaseForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Forgot password error", err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex w-full flex-col gap-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-cb-text-strong">Check your email</h3>
          <p className="text-sm text-cb-text-muted">
            We've sent a password reset link to {email}. Click the link to reset your password.
          </p>
        </div>
        <AuthButton
          type="button"
          onClick={() => router.push("/sign-in")}
          className="mt-4"
        >
          Back to Sign In
        </AuthButton>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-cb-text-strong">Reset your password</h3>
        <p className="text-sm text-cb-text-muted">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      <AuthInput
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="Enter your email"
        autoComplete="email"
      />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}
      <AuthButton type="submit" loading={loading}>
        Send Reset Link
      </AuthButton>
    </form>
  );
}
