import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";
import { AdminCopilotPageHeader } from "@/components/admin/copilot/admin-copilot-page-header";
import { CopilotPromptEditor } from "@/components/admin/copilot/copilot-prompt-editor";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { canAccessMrsCookieCopilot } from "@/lib/admin/admin-console-nav";

export const metadata: Metadata = {
  title: "Mrs. Cookie · Cookie Bite Admin",
  description:
    "Mrs. Cookie — your in-store ops co-pilot. Ask anything about orders, products, customers, and finances.",
  robots: { index: false, follow: false },
};

export default async function AdminCopilotPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Fadmin%2Fcopilot");

  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    /* ignore */
  }

  const role = await resolveStaffRole({ email, clerkUserId: userId });
  if (!canAccessMrsCookieCopilot(role)) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-4 sm:min-h-[calc(100dvh-10rem)] lg:min-h-[calc(100dvh-9rem)]">
      <AdminCopilotPageHeader />
      <CopilotPromptEditor />
      <div className="min-h-0 flex-1 rounded-2xl border border-cb-border bg-cb-surface shadow-sm">
        <CopilotChat fillParent hideHeader />
      </div>
    </div>
  );
}
