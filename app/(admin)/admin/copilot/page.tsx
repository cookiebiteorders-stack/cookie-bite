import type { Metadata } from "next";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";

export const metadata: Metadata = {
  title: "AI Copilot · Cookie Bite Admin",
  description:
    "Cookie Bite Admin Copilot — ask anything about your orders, products, customers, and finances.",
  robots: { index: false, follow: false },
};

export default function AdminCopilotPage() {
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-5">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cb-peach/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cb-brand-logo">
          AI · Beta
        </span>
        <h1 className="mt-2 text-2xl font-bold text-cb-text-strong">
          AI Copilot
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-cb-text-soft">
          Your ops co-pilot. Ask about today&apos;s revenue, pending orders,
          low-stock items, top customers, sales reports — anything in your
          admin console.
        </p>
      </div>
      <CopilotChat fullHeight />
    </div>
  );
}
