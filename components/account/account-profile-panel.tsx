"use client";

import { UserProfile } from "@clerk/nextjs";

export function AccountProfilePanel() {
  return (
    <UserProfile
      routing="hash"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none ring-1 ring-cb-border bg-cb-surface rounded-2xl",
          navbar: "bg-cb-cream rounded-xl",
          navbarButton: "text-cb-text data-[active=true]:text-cb-terracotta-dark",
          profileSectionTitle: "font-serif text-cb-text-strong",
        },
      }}
    />
  );
}
