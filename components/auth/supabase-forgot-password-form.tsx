"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthButton } from "@/components/auth/auth-button";
import { CheckCircle } from "lucide-react";
import { resetPasswordForEmail } from "@/lib/auth/client-helpers";
import { validateForgotPasswordForm } from "@/lib/auth/validation";
import { getAuthError, AuthErrorCode } from "@/lib/auth/errors";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/auth/rate-limit";

export function SupabaseForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<{ remaining: number; resetAt: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRateLimitError(null);

    // Validate form
    const validation = validateForgotPasswordForm(email);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors)[0];
      setError(errorMessage);
      return;
    }

    // Check rate limit
    const rateLimitId = getRateLimitIdentifier('password-reset', email.toLowerCase());
    const rateLimitCheck = checkRateLimit(rateLimitId, 'PASSWORD_RESET');
    
    if (!rateLimitCheck.allowed) {
      setRateLimitError({
        remaining: rateLimitCheck.remaining,
        resetAt: rateLimitCheck.resetAt,
      });
      setError("Too many password reset attempts. Please wait a few minutes before trying again.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await resetPasswordForEmail(email);

      if (resetError) {
        const authError = getAuthError(resetError);
        setError(authError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      const authError = getAuthError(AuthErrorCode.NETWORK_ERROR);
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  const formatResetTime = (resetAt: number) => {
    const seconds = Math.ceil((resetAt - Date.now()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
          {rateLimitError && (
            <p className="mt-1 text-xs opacity-90">
              Try again in {formatResetTime(rateLimitError.resetAt)}
            </p>
          )}
        </div>
      )}
      <AuthButton type="submit" loading={loading}>
        Send Reset Link
      </AuthButton>
    </form>
  );
}
