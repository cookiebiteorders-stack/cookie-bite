"use client";

import { useMemo } from "react";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";

type Options = {
  /** إخفاء عنوان Clerk داخل البطاقة — العنوان في AuthLayout */
  hideCardHeader?: boolean;
  /** إخفاء «ليس لديك حساب؟» — التبديل من AuthLayout */
  hideFooterAction?: boolean;
};

export function useClerkAuthAppearance(options: Options = {}) {
  const { hideCardHeader = true, hideFooterAction = true } = options;

  return useMemo(
    () => ({
      ...clerkAuthAppearance,
      baseTheme: "light" as const,
      variables: {
        ...clerkAuthAppearance.variables,
        colorPrimary: "#e8782a",
        colorBackground: "#fffaf4",
        colorInputBackground: "#fff8f0",
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
    }),
    [hideCardHeader, hideFooterAction],
  );
}
