"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Command, PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { BurgerButton } from "@/components/layout/responsive/burger-button";
import { useLayout } from "@/context/layout-context";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { CartBadge } from "@/src/components/cart/CartBadge";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Dashboard", href: "/" },
  { label: "Analytics", href: "/blog" },
  { label: "Projects", href: "/shop" },
  { label: "Team", href: "/our-story" },
  { label: "Settings", href: "/account" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const { toggleMdSidebar, openCommandPalette } = useLayout();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-cb-border backdrop-blur-xl transition",
        scrolled ? "bg-cb-cream/95 shadow-lg" : "bg-cb-cream/80",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-3 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={toggleMdSidebar}
          className="hidden h-11 w-11 items-center justify-center rounded-lg border border-cb-border bg-cb-surface text-cb-text-strong transition hover:bg-cb-surface-elevated md:inline-flex lg:hidden"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
        <Link href="/" className="font-layout-heading text-xl font-semibold text-cb-text-strong">
          Cookie Bite
        </Link>

        <nav className="mx-auto hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
          {NAV_LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-2 text-sm font-medium text-cb-text transition after:absolute after:bottom-0 after:start-0 after:h-0.5 after:w-0 after:bg-cb-terracotta-dark after:transition-all hover:text-cb-text-strong hover:after:w-full",
                  active && "text-cb-text-strong after:w-full",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden h-11 items-center gap-2 rounded-md border border-cb-border bg-cb-surface px-3 text-xs font-semibold text-cb-text-strong transition hover:bg-cb-surface-elevated md:inline-flex"
          aria-label="Open command palette"
        >
          <Command className="h-4 w-4" />
          <span>Cmd/Ctrl + K</span>
        </button>
        <ThemeToggle className="hidden md:inline-flex" />
        <CartBadge />
        <Link href="/shop" className={buttonClassName("primary", "hidden rounded-md px-4 lg:inline-flex")}>
          Get Started
        </Link>
        <BurgerButton />
      </div>
    </header>
  );
}

