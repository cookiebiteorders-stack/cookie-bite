"use client";

import { ClerkUserProfileEmbed } from "@/components/account/clerk-user-profile-embed";

export function AccountProfilePanel() {
  return (
    <div className="w-full min-w-0">
      <ClerkUserProfileEmbed />
    </div>
  );
}
