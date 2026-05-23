"use client";

import { useCallback, useRef, type FormEvent, type KeyboardEvent } from "react";
import { Send, Square, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onRetry?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onAbort,
  onRetry,
  disabled,
  isStreaming,
  placeholder = "اكتب رسالتك…",
  className,
  children,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = useCallback(() => {
    if (disabled || isStreaming) return;
    if (!value.trim()) return;
    onSend();
    textareaRef.current?.focus();
  }, [disabled, isStreaming, onSend, value]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex shrink-0 flex-col gap-2 border-t border-cb-border/60 bg-cb-surface-elevated/95 p-3 sm:p-4",
        className,
      )}
    >
      {children}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm text-cb-text-strong placeholder:text-cb-text-muted focus:outline-none focus:ring-2 focus:ring-cb-terracotta/40"
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          {isStreaming && onAbort ? (
            <button
              type="button"
              onClick={onAbort}
              className={cn(buttonClassName("outline"), "h-11 w-11 rounded-full p-0")}
              aria-label="Stop generating"
            >
              <Square className="mx-auto h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !value.trim()}
              className={cn(buttonClassName("primary"), "h-11 w-11 rounded-full p-0")}
              aria-label="Send"
            >
              <Send className="mx-auto h-4 w-4" />
            </button>
          )}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full p-2 text-cb-text-muted hover:bg-cb-surface-2 hover:text-cb-text-strong"
              aria-label="Retry"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
