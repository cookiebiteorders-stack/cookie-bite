"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * يكمل تدفق OAuth الذي بدأه `signIn/signUp.authenticateWithRedirect`.
 * أضف في Clerk Dashboard → Paths أو Redirect URLs القيمة:
 * `{YOUR_ORIGIN}/sso-callback`
 */
export default function SsoCallbackPage() {
  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    />
  );
}
