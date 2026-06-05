"use client";

import { useState } from "react";
import { MrBrownieAnalyticsDashboard } from "@/components/admin/mr-brownie/mr-brownie-analytics-dashboard";
import { MrBrownieConversationsPanel } from "@/components/admin/mr-brownie/mr-brownie-conversations-panel";
import { MrBrowniePromptEditor } from "@/components/admin/mr-brownie/mr-brownie-prompt-editor";

type Tab = "analytics" | "conversations" | "prompts";

export function MrBrownieAdminHub() {
  const [tab, setTab] = useState<Tab>("analytics");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-cb-text-strong">Mr. Brownie — متجر العملاء</h1>
        <p className="mt-1 text-sm text-cb-text-muted">
          تحليلات ومحادثات المتجر · Mrs. Cookie للأدمن فقط في{" "}
          <a href="/admin/copilot" className="font-semibold text-cb-brand-logo underline">
            /admin/copilot
          </a>
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["analytics", "التحليلات"],
              ["conversations", "المحادثات"],
              ["prompts", "البرومبتات"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === id
                  ? "bg-[#d4a055] text-[#3b2008]"
                  : "border border-cb-border bg-white text-cb-text-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "analytics" ? <MrBrownieAnalyticsDashboard embedded /> : null}
      {tab === "conversations" ? <MrBrownieConversationsPanel /> : null}
      {tab === "prompts" ? <MrBrowniePromptEditor /> : null}
    </div>
  );
}
