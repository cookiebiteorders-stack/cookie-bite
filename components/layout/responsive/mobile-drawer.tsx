"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLayout } from "@/context/layout-context";
import { useLockBodyScroll } from "@/hooks/use-lock-body-scroll";
import { buttonClassName } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "Analytics", href: "/blog" },
  { label: "Projects", href: "/shop" },
  { label: "Team", href: "/our-story" },
  { label: "Settings", href: "/account" },
] as const;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileDrawer() {
  const { isMobileMenuOpen, closeMobileMenu } = useLayout();
  const panelRef = useRef<HTMLDivElement | null>(null);
  useLockBodyScroll(isMobileMenuOpen);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeMobileMenu, isMobileMenuOpen]);

  return (
    <AnimatePresence>
      {isMobileMenuOpen ? (
        <motion.div
          className="fixed inset-0 z-[80] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-cb-scrim-strong/70"
            aria-label="Close menu overlay"
            onClick={closeMobileMenu}
          />
          <motion.div
            id="mobile-nav-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            className="absolute left-0 top-0 flex h-full w-[min(88vw,320px)] flex-col rounded-r-xl border-r border-cb-border bg-cb-surface p-4"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-center justify-between">
              <p className="font-serif text-lg font-semibold text-cb-text-strong">Cookie Bite</p>
              <ThemeToggle />
            </div>
            <nav className="mt-6 flex flex-col gap-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-cb-text-strong hover:bg-cb-peach/50"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/shop"
              className={buttonClassName("primary", "mt-auto rounded-md")}
              onClick={closeMobileMenu}
            >
              Get Started
            </Link>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

