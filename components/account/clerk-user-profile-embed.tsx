"use client";

import { UserProfile } from "@clerk/nextjs";
import { clerkProfileAppearance } from "@/lib/auth/clerk-profile-appearance";

type ClerkUserProfileEmbedProps = {
  /** مسار التوجيه الفرعي — افتراضي إعدادات الحساب */
  basePath?: string;
};

/**
 * واجهة Clerk لإدارة الحساب — عرض كامل، LTR، بدون قيود بطاقة تسجيل الدخول.
 */
export function ClerkUserProfileEmbed({
  basePath = "/account/settings",
}: ClerkUserProfileEmbedProps) {
  return (
    <div className="cb-clerk-profile w-full min-w-0" dir="ltr" lang="en">
      <UserProfile
        routing="path"
        path={basePath}
        appearance={clerkProfileAppearance}
      />
    </div>
  );
}
