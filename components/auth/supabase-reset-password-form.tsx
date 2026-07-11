"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthButton } from "@/components/auth/auth-button";
import { PasswordRulesHint } from "@/components/auth/password-rules-hint";
import { updatePassword } from "@/lib/auth/client-helpers";
import { validateResetPasswordForm } from "@/lib/auth/validation";
import { getAuthError, AuthErrorCode } from "@/lib/auth/errors";

export function SupabaseResetPasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    const validation = validateResetPasswordForm(password, confirmPassword);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors)[0];
      setError(errorMessage);
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        const authError = getAuthError(updateError);
        setError(authError.message);
        return;
      }

      router.push("/sign-in?message=Password reset successfully");
    } catch (err) {
      const authError = getAuthError(AuthErrorCode.NETWORK_ERROR);
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-cb-text-strong">Set new password</h3>
        <p className="text-sm text-cb-text-muted">
          Enter your new password below
        </p>
      </div>
      <AuthInput
        label="New Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="Enter your new password"
        autoComplete="new-password"
      />
      <AuthInput
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        placeholder="Confirm your new password"
        autoComplete="new-password"
      />
      <PasswordRulesHint containerRef={formRef} variant="auth" />
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300" role="alert">
          {error}
        </div>
      )}
      <AuthButton type="submit" loading={loading}>
        Update Password
      </AuthButton>
    </form>
  );
}
