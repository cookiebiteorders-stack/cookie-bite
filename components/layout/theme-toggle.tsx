"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

const btn =
  "inline-flex h-11 min-h-[2.75rem] w-11 min-w-[2.75rem] items-center justify-center rounded-xl border border-cb-border bg-cb-surface/80 text-cb-text-strong shadow-sm backdrop-blur-sm transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-px hover:border-cb-terracotta-dark/35 hover:bg-cb-peach/50 hover:shadow-md active:scale-[0.98] dark:border-cb-border dark:bg-cb-surface-2/90 dark:text-cb-text-strong dark:hover:bg-cb-peach/20";

interface ClickOrigin {
  x: number;
  y: number;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [overlayActive, setOverlayActive] = useState(false);
  const [origin, setOrigin] = useState<ClickOrigin | null>(null);
  const [targetTheme, setTargetTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTheme(isDark ? "light" : "dark");
      return;
    }

    const nextTheme = isDark ? "light" : "dark";
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || rect.left + rect.width / 2;
    const y = e.clientY || rect.top + rect.height / 2;

    setOrigin({ x, y });
    setTargetTheme(nextTheme);
    setOverlayActive(true);

    // The animation duration is ~0.8s for the last layer
    // We swap the actual theme at 0.6s when the screen is fully covered by the solid color
    setTimeout(() => {
      setTheme(nextTheme);
    }, 600);

    // Unmount the overlay after everything finishes
    setTimeout(() => {
      setOverlayActive(false);
    }, 1200);
  };

  if (!mounted) {
    return <span className={cn(btn, "pointer-events-none opacity-40", className)} aria-hidden />;
  }

  return (
    <>
      <button
        type="button"
        className={cn(btn, className)}
        onClick={handleToggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? (
          <Sun className="h-[1.15rem] w-[1.15rem]" aria-hidden />
        ) : (
          <Moon className="h-[1.15rem] w-[1.15rem]" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {overlayActive && origin && targetTheme && (
          <LiquidOverlay origin={origin} targetTheme={targetTheme} />
        )}
      </AnimatePresence>
    </>
  );
}

function LiquidOverlay({
  origin,
  targetTheme,
}: {
  origin: ClickOrigin;
  targetTheme: "dark" | "light";
}) {
  const maxRadius = useMemo(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return Math.hypot(
      Math.max(origin.x, w - origin.x),
      Math.max(origin.y, h - origin.y),
    );
  }, [origin]);

  if (maxRadius === 0) return null;

  // The 3 layers of colors for the ripple
  const colors =
    targetTheme === "dark"
      ? ["#ff8c42", "#4a2814", "#221208"] // Terracotta -> Brown -> Dark Cream
      : ["#ff8c42", "#ffeada", "#faf7f2"]; // Terracotta -> Surface2 -> Light Cream

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {colors.map((color, index) => (
        <motion.div
          key={index}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.8,
            delay: index * 0.12, // Stagger the layers
            ease: [0.76, 0, 0.24, 1], // Premium Apple-like ease out
          }}
          style={{
            position: "absolute",
            left: origin.x - maxRadius,
            top: origin.y - maxRadius,
            width: maxRadius * 2,
            height: maxRadius * 2,
            borderRadius: "50%",
            backgroundColor: color,
            willChange: "transform",
          }}
        />
      ))}
    </div>,
    document.body
  );
}
