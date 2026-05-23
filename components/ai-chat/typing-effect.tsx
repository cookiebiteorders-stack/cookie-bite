"use client";

import { motion } from "motion/react";
import { useTypingEffect } from "@/hooks/use-typing-effect";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import { cn } from "@/lib/utils";

export function TypingIndicator({ className }: { className?: string }) {
  const dots = [0, 1, 2];
  return (
    <div
      className={cn("flex items-center gap-1 px-1 py-2", className)}
      role="status"
      aria-label="Typing"
    >
      {dots.map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-cb-text-muted"
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function TypingEffect({
  text,
  active,
  className,
}: {
  text: string;
  active?: boolean;
  className?: string;
}) {
  const displayed = useTypingEffect({
    target: text,
    active: active ?? false,
  });

  if (!getChatbotConfig().typing.enabled) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{displayed}</span>;
}
