"use client";

import { UserProfile } from "@clerk/nextjs";
import { clerkProfileAppearance } from "@/lib/auth/clerk-profile-appearance";

/**
 * واجهة Clerk لإدارة الحساب — hash routing + تخطيط حسب عرض الحاوية (انظر clerk-profile.css).
 */
export function ClerkUserProfileEmbed() {
  return (
    <div className="cb-clerk-profile w-full min-w-0" dir="ltr" lang="en">
      <UserProfile
        routing="hash"
        appearance={clerkProfileAppearance}
      />
    </div>
  );
}
