"use client";

import { useCallback, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { ChatWindow } from "@/components/ai-chat/chat-window";
import { ChatInput } from "@/components/ai-chat/chat-input";
import { MessageBubble } from "@/components/ai-chat/message-bubble";
import { TypingIndicator } from "@/components/ai-chat/typing-effect";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import { useChatStream } from "@/hooks/use-chat-stream";
import { cn } from "@/lib/utils";

type AiChatAppProps = {
  title?: string;
  subtitle?: string;
  endpoint?: string;
  className?: string;
  suggestions?: string[];
};

export function AiChatApp({
  title = "AI Chat",
  subtitle = "Streaming · Markdown · Human typing",
  endpoint = "/api/chat",
  className,
  suggestions = [],
}: AiChatAppProps) {
  const config = getChatbotConfig();
  const { theme, setTheme } = useTheme();
  const [input, setInput] = useState("");

  const { messages, send, abort, retry, isStreaming, lastError } = useChatStream({
    endpoint,
  });

  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    void send(t);
  }, [input, send]);

  return (
    <div
      className={cn(
        "mx-auto flex h-[min(100dvh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-[#0f0f0f] text-zinc-50 shadow-2xl dark:border-zinc-700",
        config.mobile.responsive && "max-sm:rounded-none max-sm:h-dvh max-sm:max-w-none",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-serif text-lg font-semibold">{title}</h1>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
        {config.theme.allowToggle ? (
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        ) : null}
      </header>

      <ChatWindow scrollKey={messages.length + (isStreaming ? 1 : 0)} className="px-4 py-4 sm:px-6">
        {messages.length === 0 && suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role === "user" ? "user" : "assistant"}
            content={m.content}
            isStreaming={m.status === "streaming"}
            imageUrls={m.imageUrls}
          />
        ))}

        {isStreaming && messages[messages.length - 1]?.content === "" ? (
          <TypingIndicator />
        ) : null}

        {lastError ? (
          <p className="text-sm text-red-400" role="alert">
            {lastError}
          </p>
        ) : null}
      </ChatWindow>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onAbort={abort}
        onRetry={lastError ? retry : undefined}
        isStreaming={isStreaming}
        disabled={false}
      />
    </div>
  );
}
