import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "@/components/account/complete-profile-form";
import { isProfileComplete } from "@/lib/account/profile-complete";
import { getUserByClerkId } from "@/lib/db/users";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Complete your profile",
  description: "Add your name, phone, and delivery address for Cookie Bite orders.",
  path: "/account/complete-profile",
  noIndex: true,
});

export default async function CompleteProfilePage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account/complete-profile");
  }

  const dbUser = await getUserByClerkId(userId);
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
