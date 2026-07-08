import type { Metadata } from "next";
import { auth } from "@/lib/auth/supabase-auth";
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
  const { userId, user } = await auth();
  if (!userId || !user) redirect("/sign-in?redirect_url=%2Fadmin%2Fcopilot");

  const email = user.email ?? null;
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
