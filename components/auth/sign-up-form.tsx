"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { useTheme } from "@/components/providers/theme-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { getDesktopSocialPopupPreference, AUTH_SOCIAL_POPUP_DESKTOP_KEY } from "@/lib/auth/social-preferences";

type SignUpFormProps = {
  afterAuth: string;
};

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
    navigator.userAgent,
  );
}

export function SignUpForm({ afterAuth }: SignUpFormProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useLanguage();
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
        /** مطابقة تسجيل الدخول — إخفاء صف التبديل المدمج في Clerk؛ رابط «تسجيل الدخول» أسفل النموذج في الواجهة */
        footerAction: "hidden",
      },
    };
  }, [resolvedTheme]);

  return (
    <>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        appearance={appearance}
        oauthFlow={oauthFlow}
        oidcPrompt="select_account"
        fallbackRedirectUrl={afterAuth}
        forceRedirectUrl={afterAuth}
        signInFallbackRedirectUrl={afterAuth}
        signInForceRedirectUrl={afterAuth}
      />
      <p className="mt-4 text-center text-sm text-cb-text-muted">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link
          href={
            afterAuth && afterAuth !== "/account"
              ? `/sign-in?redirect_url=${encodeURIComponent(afterAuth)}`
              : "/sign-in"
          }
          className="font-semibold text-cb-terracotta-dark underline-offset-2 hover:underline dark:text-cb-terracotta"
        >
          {t("actions.signIn")}
        </Link>
      </p>
    </>
  );
}

