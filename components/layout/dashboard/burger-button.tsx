"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLayout } from "@/lib/context/layout-context";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function BurgerButton({ className }: Props) {
  const { isMobileMenuOpen, toggleMobileMenu } = useLayout();

  return (
    <button
      type="button"
      onClick={toggleMobileMenu}
      aria-expanded={isMobileMenuOpen}
      aria-controls="dashboard-mobile-drawer"
      aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl",
        "border border-cb-border bg-cb-surface text-cb-text-strong",
        "transition-[transform,background-color,box-shadow] duration-200",
        "hover:-translate-y-px hover:bg-cb-hover-overlay",
        "active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-focus",
        "lg:hidden",
        className,
      )}
    >
      <span className="relative inline-flex h-5 w-5 items-center justify-center">
        <AnimatePresence initial={false} mode="wait">
          {isMobileMenuOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="absolute inset-0 inline-flex items-center justify-center"
            >
              <X className="h-5 w-5" aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key="menu"
              initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="absolute inset-0 inline-flex items-center justify-center"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}
