import type { Metadata } from "next";
import { CopilotChat } from "@/components/admin/copilot/copilot-chat";
import { MrsCookieAvatar } from "@/components/admin/copilot/mrs-cookie-avatar";

export const metadata: Metadata = {
  title: "Mrs. Cookie · Cookie Bite Admin",
  description:
    "Mrs. Cookie — your in-store ops co-pilot. Ask anything about orders, products, customers, and finances.",
  robots: { index: false, follow: false },
};

export default function AdminCopilotPage() {
  return (
    <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-4 sm:min-h-[calc(100dvh-10rem)] lg:min-h-[calc(100dvh-9rem)]">
      <header className="flex shrink-0 items-start gap-3 sm:gap-4">
        <MrsCookieAvatar size={56} className="shrink-0 sm:hidden" />
        <MrsCookieAvatar size={72} className="hidden shrink-0 sm:block" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cb-peach/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cb-brand-logo">
            AI · Beta
          </span>
          <h1 className="mt-2 text-xl font-bold text-cb-text-strong sm:text-2xl">
            Mrs. Cookie
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-cb-text-soft">
            Your bakery ops co-pilot — revenue, orders, stock, customers, and
            reports.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 rounded-2xl border border-cb-border bg-cb-surface shadow-sm">
        <CopilotChat fillParent hideHeader />
      </div>
    </div>
  );
}
