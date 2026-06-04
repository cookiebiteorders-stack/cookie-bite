import type { Metadata } from "next";
import { AiChatApp } from "@/components/ai-chat/ai-chat-app";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Chat Demo",
  description: "Cookie Bite streaming chat demo — SSE, typing effect, Markdown.",
  path: "/demo/ai-chat",
  noIndex: true,
});

export default function AiChatDemoPage() {
  return (
    <div className="min-h-dvh bg-zinc-950 px-4 py-8">
      <AiChatApp
        title="Cookie Bite AI"
        subtitle="نفس عقل Mr. Brownie · بث حي · Markdown"
        suggestions={[
          "What cookies pair best with coffee?",
          "Explain delivery zones in Cairo",
          "Write a short gift message in Arabic",
        ]}
        extraBody={{
          session: { pathname: "/demo/ai-chat", locale: "auto" },
        }}
      />
    </div>
  );
}
