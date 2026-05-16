"use client";

import { useEffect, useMemo, useState } from "react";
import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { useTheme } from "@/components/providers/theme-provider";
import { getDesktopSocialPopupPreference, AUTH_SOCIAL_POPUP_DESKTOP_KEY } from "@/lib/auth/social-preferences";

type SignInFormProps = {
  afterAuth: string;
};

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
    navigator.userAgent,
  );
}

export function SignInForm({ afterAuth }: SignInFormProps) {
  const { resolvedTheme } = useTheme();
  const [desktopPopupEnabled, setDesktopPopupEnabled] = useState(() =>
    getDesktopSocialPopupPreference(),
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_SOCIAL_POPUP_DESKTOP_KEY) {
        setDesktopPopupEnabled(getDesktopSocialPopupPreference());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const oauthFlow = useMemo(() => {
    if (isMobileDevice()) return "redirect";
    return desktopPopupEnabled ? "popup" : "redirect";
  }, [desktopPopupEnabled]);

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
        /** إخفاء صف «ليس لديك حساب؟ / Create account» — القسم السفلي يُدار من التطبيق عند الحاجة */
        footerAction: "hidden",
      },
    };
  }, [resolvedTheme]);

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      appearance={appearance}
      oauthFlow={oauthFlow}
      oidcPrompt="select_account"
      fallbackRedirectUrl={afterAuth}
      forceRedirectUrl={afterAuth}
      signUpFallbackRedirectUrl={afterAuth}
      signUpForceRedirectUrl={afterAuth}
    />
  );
}

