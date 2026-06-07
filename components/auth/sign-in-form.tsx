"use client";

import { SignIn } from "@clerk/nextjs";
import { ClerkAuthShell } from "@/components/auth/clerk-auth-shell";
import { useClerkAuthAppearance } from "@/components/auth/use-clerk-auth-appearance";

type SignInFormProps = {
  afterAuth: string;
};

export function SignInForm({ afterAuth }: SignInFormProps) {
  const appearance = useClerkAuthAppearance();

  return (
    <ClerkAuthShell>
      <div className="w-full">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          appearance={appearance}
          oauthFlow="redirect"
          oidcPrompt="select_account"
          fallbackRedirectUrl={afterAuth}
          forceRedirectUrl={afterAuth}
          signUpFallbackRedirectUrl={afterAuth}
          signUpForceRedirectUrl={afterAuth}
        />
      </div>
    </ClerkAuthShell>
  );
}
