"use client";

import { useMemo } from "react";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { useTheme } from "@/components/providers/theme-provider";

type Options = {
  /** إخفاء عنوان Clerk داخل البطاقة — العنوان في AuthLayout */
  hideCardHeader?: boolean;
  /** إخفاء «ليس لديك حساب؟» — التبديل من AuthLayout */
  hideFooterAction?: boolean;
};

export function useClerkAuthAppearance(options: Options = {}) {
  const { hideCardHeader = true, hideFooterAction = true } = options;
  const { resolvedTheme } = useTheme();

  return useMemo(() => {
    const isDark = resolvedTheme === "dark";
    return {
      ...clerkAuthAppearance,
      baseTheme: isDark ? ("dark" as const) : ("light" as const),
      variables: {
        ...clerkAuthAppearance.variables,
        ...(isDark
          ? {
              colorPrimary: "#e88a4e",
              colorDanger: "#fca5a5",
              colorSuccess: "#86efac",
              colorText: "#fafaf9",
              colorTextSecondary: "#a8a29e",
              colorBackground: "#1c1917",
              colorInputBackground: "#292524",
              colorInputText: "#fafaf9",
            }
          : {
              colorPrimary: "#c1692c",
              colorBackground: "#fffdf9",
              colorInputBackground: "#fdf9f3",
            }),
      },
      elements: {
        ...clerkAuthAppearance.elements,
        ...(hideCardHeader
          ? {
              headerTitle: "!hidden",
              headerSubtitle: "!hidden",
            }
          : {}),
        ...(hideFooterAction ? { footerAction: "!hidden" } : {}),
      },
    };
  }, [resolvedTheme, hideCardHeader, hideFooterAction]);
}
