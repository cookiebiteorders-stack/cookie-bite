"use client";

import { useMemo } from "react";
import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { useTheme } from "@/components/providers/theme-provider";

type SignInFormProps = {
  afterAuth: string;
};

export function SignInForm({ afterAuth }: SignInFormProps) {
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
        /** العنوان يُعرض في AuthLayout — نخفي رأس Clerk لتجنب التكرار */
        header: "hidden",
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
      /** دائماً redirect — وضع popup يفتح تبويباً/نافذة فارغة لدى كثير من المستخدمين (Clerk + PWA/أمان المتصفح). */
      oauthFlow="redirect"
      oidcPrompt="select_account"
      fallbackRedirectUrl={afterAuth}
      forceRedirectUrl={afterAuth}
      signUpFallbackRedirectUrl={afterAuth}
      signUpForceRedirectUrl={afterAuth}
    />
  );
}

