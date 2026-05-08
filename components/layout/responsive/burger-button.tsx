"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLayout } from "@/context/layout-context";

export function BurgerButton() {
  const { isMobileMenuOpen, toggleMobileMenu } = useLayout();
  return (
    <button
      type="button"
      aria-expanded={isMobileMenuOpen}
      aria-controls="mobile-nav-drawer"
      aria-label="Toggle navigation"
      onClick={toggleMobileMenu}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-cb-border bg-cb-surface text-cb-text-strong transition hover:bg-cb-surface-elevated lg:hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isMobileMenuOpen ? "close" : "open"}
          initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 90, scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

