"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { LokiLensEngine } from "@/lib/effects/loki-lens";
import { cn } from "@/lib/utils";

const btn =
  "inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl border border-cb-border bg-cb-surface/80 text-cb-text-strong shadow-sm backdrop-blur-sm transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-cb-terracotta-dark/35 hover:bg-cb-peach/50 hover:shadow-md active:scale-[0.98] dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-text-strong dark:hover:bg-cb-peach/20";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [running, setRunning] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const lensRef = useRef<LokiLensEngine | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    lensRef.current = new LokiLensEngine();
    return () => {};
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (running) return;

    const nextTheme = isDark ? "light" : "dark";
    const buttonEl = buttonRef.current ?? e.currentTarget;
    const rect = buttonEl.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;

    void (lensRef.current ?? new LokiLensEngine()).run({
      originX: x,
      originY: y,
      targetRealm: nextTheme,
      onSwapTheme: () => setTheme(nextTheme),
      onToggleClass: (active) => setRunning(active),
    });
  };

  if (!mounted) {
    return <span className={cn(btn, "pointer-events-none opacity-40", className)} aria-hidden />;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={cn(btn, "loki-theme-toggle", running && "loki-theme-toggle--running", className)}
        data-loki="click"
        data-loki-skip-init="true"
        onClick={handleToggle}
        disabled={running}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="h-[1.15rem] w-[1.15rem]" aria-hidden />
        ) : (
          <Moon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
        )}
      </button>

    </>
  );
}
