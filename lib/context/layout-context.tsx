"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { BREAKPOINTS, useMediaQuery } from "@/lib/hooks/use-media-query";

const SIDEBAR_STORAGE_KEY = "cb_dash_sidebar_collapsed_v1";

type LayoutContextValue = {
  isMobileMenuOpen: boolean;
  isSidebarCollapsed: boolean;
  isLg: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLg = useMediaQuery(BREAKPOINTS.lg);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (raw === "1") setIsSidebarCollapsedState(true);
      if (raw === "0") setIsSidebarCollapsedState(false);
    } catch {
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        isSidebarCollapsed ? "1" : "0",
      );
    } catch {
    }
  }, [isSidebarCollapsed, hydrated]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLg) setIsMobileMenuOpen(false);
  }, [isLg]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((v) => !v);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsedState((v) => !v);
  }, []);

  const setSidebarCollapsed = useCallback((value: boolean) => {
    setIsSidebarCollapsedState(value);
  }, []);

  const value = useMemo<LayoutContextValue>(
    () => ({
      isMobileMenuOpen,
      isSidebarCollapsed,
      isLg,
      toggleMobileMenu,
      closeMobileMenu,
      toggleSidebar,
      setSidebarCollapsed,
    }),
    [
      isMobileMenuOpen,
      isSidebarCollapsed,
      isLg,
      toggleMobileMenu,
      closeMobileMenu,
      toggleSidebar,
      setSidebarCollapsed,
    ],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayout must be used within <LayoutProvider />");
  }
  return ctx;
}
