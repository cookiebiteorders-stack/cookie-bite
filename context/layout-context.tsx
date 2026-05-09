"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";

type LayoutContextValue = {
  isMobileMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  isMdSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleSidebar: () => void;
  toggleMdSidebar: () => void;
  closeMdSidebar: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const LG_BREAKPOINT = 1024;
  const isBelowLg = useMediaQuery("(max-width: 1023px)");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMdSidebarOpen, setIsMdSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIsMobileMenuOpen(false);
      setIsMdSidebarOpen(false);
      setIsCommandPaletteOpen(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    if (!isBelowLg) return;
    const id = window.setTimeout(() => {
      setIsSidebarCollapsed(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [isBelowLg]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const element = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width < LG_BREAKPOINT) {
        setIsSidebarCollapsed(true);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setIsCommandPaletteOpen((v) => !v);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<LayoutContextValue>(
    () => ({
      isMobileMenuOpen,
      isSidebarCollapsed,
      isMdSidebarOpen,
      isCommandPaletteOpen,
      toggleMobileMenu: () => setIsMobileMenuOpen((v) => !v),
      closeMobileMenu: () => setIsMobileMenuOpen(false),
      toggleSidebar: () => setIsSidebarCollapsed((v) => !v),
      toggleMdSidebar: () => setIsMdSidebarOpen((v) => !v),
      closeMdSidebar: () => setIsMdSidebarOpen(false),
      openCommandPalette: () => setIsCommandPaletteOpen(true),
      closeCommandPalette: () => setIsCommandPaletteOpen(false),
    }),
    [isMobileMenuOpen, isSidebarCollapsed, isMdSidebarOpen, isCommandPaletteOpen],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used inside LayoutProvider");
  }
  return context;
}

