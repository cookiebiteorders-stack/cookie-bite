"use client";

import { UserProfile } from "@clerk/nextjs";
import { clerkProfileAppearance } from "@/lib/auth/clerk-profile-appearance";
import { useLanguage } from "@/components/providers/language-provider";

/**
 * واجهة Clerk لإدارة الحساب — hash routing + تخطيط حسب عرض الحاوية (انظر clerk-profile.css).
 */
export function ClerkUserProfileEmbed() {
  const { lang } = useLanguage();

  return (
    <div
      className="cb-clerk-profile w-full min-w-0"
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      <UserProfile routing="hash" appearance={clerkProfileAppearance} />
    </div>
  );
}
