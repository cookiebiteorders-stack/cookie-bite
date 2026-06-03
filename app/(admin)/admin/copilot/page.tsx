import type { Metadata } from "next";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";
import { AdminCopilotPageHeader } from "@/components/admin/copilot/admin-copilot-page-header";

export const metadata: Metadata = {
  title: "Mrs. Cookie · Cookie Bite Admin",
  description:
    "Mrs. Cookie — your in-store ops co-pilot. Ask anything about orders, products, customers, and finances.",
  robots: { index: false, follow: false },
};

export default function AdminCopilotPage() {
  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-4 sm:min-h-[calc(100dvh-10rem)] lg:min-h-[calc(100dvh-9rem)]">
      <AdminCopilotPageHeader />
      <div className="min-h-0 flex-1 rounded-2xl border border-cb-border bg-cb-surface shadow-sm">
        <CopilotChat fillParent hideHeader />
      </div>
    </div>
  );
}
