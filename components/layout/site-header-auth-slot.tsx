"use client";

import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { UserAccountDropdown } from "@/components/ui/profile-dropdown";
import { useLanguage } from "@/components/providers/language-provider";

const iconBtn =
  "cb-touch-manipulation inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl text-cb-text transition-[transform,box-shadow,color,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:bg-cb-hover-overlay hover:text-cb-terracotta-dark hover:shadow-sm active:scale-[0.97] dark:hover:bg-cb-peach/15";

/** Auth slot — useSupabaseAuth فقط (لا يحتاج Clerk UI renderer مثل مكوّن Show). */
export function SiteHeaderAuthSlot() {
  const { t } = useLanguage();
  const { isLoaded, isSignedIn } = useSupabaseAuth();

  if (!isLoaded) {
    return (
      <Link href="/sign-in" className={iconBtn} aria-label={t("actions.signIn")}>
        <UserRound className="h-5 w-5" aria-hidden />
      </Link>
    );
  }

  if (isSignedIn) {
    return <UserAccountDropdown />;
  }

  return (
    <Link href="/sign-in" className={iconBtn} aria-label={t("actions.signIn")}>
      <UserRound className="h-5 w-5" aria-hidden />
    </Link>
  );
}
