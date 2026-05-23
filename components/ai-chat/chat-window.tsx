"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import { cn } from "@/lib/utils";

type ChatWindowProps = {
  children: ReactNode;
  className?: string;
  /** مفتاح يُحدَّث عند تغيّر المحتوى لتحريك التمرير */
  scrollKey?: string | number;
};

export function ChatWindow({ children, className, scrollKey }: ChatWindowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const config = getChatbotConfig();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const behavior = config.animations.smoothScroll ? "smooth" : "auto";
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, [children, scrollKey, config.animations.smoothScroll]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain",
        config.mobile.safeArea && "pb-[env(safe-area-inset-bottom)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
