"use client";

import { useMemo } from "react";
import { SignUp } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { useTheme } from "@/components/providers/theme-provider";

type SignUpFormProps = {
  afterAuth: string;
};

export function SignUpForm({ afterAuth }: SignUpFormProps) {
  const { resolvedTheme } = useTheme();

  const appearance = useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      ...clerkAuthAppearance,
      baseTheme: isDark ? ("dark" as const) : ("light" as const),
      variables: {
        ...clerkAuthAppearance.variables,
        ...(isDark
          ? {
              colorPrimary: "#f97316",
              colorDanger: "#fca5a5",
              colorSuccess: "#86efac",
              colorText: "#f5f5f4",
              colorTextSecondary: "#a8a29e",
              colorBackground: "transparent",
              colorInputBackground: "#1c1917",
              colorInputText: "#fafaf9",
            }
          : {
              colorBackground: "#fdfbf7",
              colorInputBackground: "#fdf9f3",
            }),
      },
      elements: {
        ...clerkAuthAppearance.elements,
      },
    };
  }, [resolvedTheme]);

  const signInUrl = useMemo(() => {
    if (afterAuth && afterAuth !== "/account") {
      return `/sign-in?redirect_url=${encodeURIComponent(afterAuth)}`;
    }
    return "/sign-in";
  }, [afterAuth]);

  return (
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
  );
}

