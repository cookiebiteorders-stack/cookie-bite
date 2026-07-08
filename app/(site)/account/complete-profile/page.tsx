import type { Metadata } from "next";
import { auth } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/components/account/complete-profile-form";
import { isProfileComplete } from "@/lib/account/profile-complete";
import { ensureDbUserForSupabase } from "@/lib/db/ensure-db-user";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Complete your profile",
  description: "Add your name, phone, and delivery address for Cookie Bite orders.",
  path: "/account/complete-profile",
  noIndex: true,
});

export default async function CompleteProfilePage() {
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=/account/complete-profile");
  }

  const dbUser = await ensureDbUserForSupabase(userId, user.email ?? "", user.user_metadata?.full_name ?? null, user.user_metadata?.avatar_url ?? null);
  if (dbUser && isProfileComplete(dbUser)) {
    redirect("/account");
  }

  return (
    <div className="bg-cb-cream py-10">
      <div className="mx-auto max-w-7xl cb-gutter">
        <CompleteProfileForm />
      </div>
    </div>
  );
}
