"use client";

import { useMemo } from "react";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { CLERK_BRAND_VARIABLES } from "@/lib/auth/clerk-brand-appearance";

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
        ...CLERK_BRAND_VARIABLES,
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
