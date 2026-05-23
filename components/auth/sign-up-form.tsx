"use client";

import { useMemo } from "react";
import { SignUp } from "@clerk/nextjs";
import { ClerkAuthShell } from "@/components/auth/clerk-auth-shell";
import { useClerkAuthAppearance } from "@/components/auth/use-clerk-auth-appearance";

type SignUpFormProps = {
  afterAuth: string;
};

export function SignUpForm({ afterAuth }: SignUpFormProps) {
  const appearance = useClerkAuthAppearance();

  const signInUrl = useMemo(() => {
    if (afterAuth && afterAuth !== "/account/complete-profile") {
      return `/sign-in?redirect_url=${encodeURIComponent(afterAuth)}`;
    }
    return "/sign-in";
  }, [afterAuth]);

  return (
    <ClerkAuthShell>
      <div className="w-full min-h-[min(20rem,42dvh)] sm:min-h-[min(22rem,48vh)]">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl={signInUrl}
          appearance={appearance}
          oauthFlow="redirect"
          oidcPrompt="select_account"
          fallbackRedirectUrl={afterAuth}
          forceRedirectUrl={afterAuth}
          signInFallbackRedirectUrl={afterAuth}
          signInForceRedirectUrl={afterAuth}
        />
      </div>
    </ClerkAuthShell>
  );
}
