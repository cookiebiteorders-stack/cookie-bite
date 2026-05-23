"use client";

import { getChatbotConfig } from "@/lib/ai-chat/config";
import { cn } from "@/lib/utils";

type CursorProps = {
  className?: string;
};

export function Cursor({ className }: CursorProps) {
  const config = getChatbotConfig().cursor;
  if (!config.enabled) return null;

  return (
    <span
      className={cn("inline-block font-normal text-cb-terracotta", className)}
      style={{
        animation: `ai-chat-cursor-blink ${config.blinkSpeed}s step-end infinite`,
      }}
      aria-hidden
    >
      {config.style}
    </span>
  );
}
