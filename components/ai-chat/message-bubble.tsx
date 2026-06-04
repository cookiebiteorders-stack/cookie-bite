"use client";

import { memo } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import { Copy, Check, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import { Cursor } from "@/components/ai-chat/cursor";
import { MarkdownRenderer } from "@/components/ai-chat/markdown-renderer";
import { useTypingEffect } from "@/hooks/use-typing-effect";
import { cn } from "@/lib/utils";

export type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  imageUrls?: string[];
  variant?: "default" | "mr-brownie";
  className?: string;
  showFeedback?: boolean;
  feedbackRating?: 1 | -1 | null;
  onFeedback?: (rating: 1 | -1) => void;
};

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  isStreaming = false,
  imageUrls,
  variant = "default",
  className,
  showFeedback = false,
  feedbackRating = null,
  onFeedback,
}: MessageBubbleProps) {
  const config = getChatbotConfig();
  const displayed = useTypingEffect({
    target: content,
    active: isStreaming,
    enabled: role === "assistant" && config.streaming.smoothStreaming,
  });

  const [copied, setCopied] = useState(false);
  const text = role === "assistant" && config.streaming.smoothStreaming ? displayed : content;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const isUser = role === "user";
  const mrBrownie = variant === "mr-brownie";

  const bubble = (
    <div
      className={cn(
        "group relative max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
        isUser
          ? mrBrownie
            ? "ms-auto bg-gradient-to-br from-cb-terracotta-dark to-cb-terracotta text-white"
            : "ms-auto bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
          : mrBrownie
            ? "me-auto bg-cb-cream/95 text-cb-text-strong ring-1 ring-cb-border/55 dark:bg-cb-surface-2"
            : "me-auto border border-zinc-800 bg-zinc-900 text-zinc-50",
        className,
      )}
    >
      {imageUrls && imageUrls.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {imageUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block h-16 w-16 overflow-hidden rounded-lg ring-1 ring-white/20"
            >
              <Image src={url} alt="" fill className="object-cover" unoptimized />
            </a>
          ))}
        </div>
      ) : null}

      {isUser ? (
        <p className="whitespace-pre-wrap break-words">{content}</p>
      ) : (
        <>
          <MarkdownRenderer content={text} />
          {isStreaming && config.cursor.enabled ? <Cursor /> : null}
        </>
      )}

      {!isUser && content && !isStreaming ? (
        <div className="absolute -bottom-1 end-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {showFeedback && onFeedback ? (
            <>
              <button
                type="button"
                onClick={() => onFeedback(1)}
                disabled={feedbackRating != null}
                className={cn(
                  "rounded-md p-1",
                  feedbackRating === 1
                    ? "bg-emerald-600/90 text-white"
                    : "bg-zinc-800/90 text-zinc-300 hover:text-white",
                )}
                aria-label="رد مفيد"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback(-1)}
                disabled={feedbackRating != null}
                className={cn(
                  "rounded-md p-1",
                  feedbackRating === -1
                    ? "bg-red-600/90 text-white"
                    : "bg-zinc-800/90 text-zinc-300 hover:text-white",
                )}
                aria-label="رد غير مفيد"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-md bg-zinc-800/90 p-1 text-zinc-300 hover:text-white"
            aria-label="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      ) : null}
    </div>
  );

  if (!config.animations.bubbleAnimation) return bubble;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={cn(isUser ? "ms-auto" : "me-auto")}
    >
      {bubble}
    </motion.div>
  );
});
