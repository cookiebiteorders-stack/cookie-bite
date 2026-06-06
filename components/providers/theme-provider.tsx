"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";
import { THEME_COOKIE, writeClientPrefCookie } from "@/lib/preferences/client-cookies";

type ThemeProviderProps = {
  children: ReactNode;
};

type ThemeContextValue = {
  theme: "light";
  resolvedTheme: "light";
  setTheme: (theme: "light" | "dark" | "system") => void;
};

const STORAGE_KEY = "cookie-bite-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyLightTheme() {
  const root = document.documentElement;
  root.classList.remove("dark");
  root.setAttribute("data-theme", "light");
  root.style.colorScheme = "light";
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useLayoutEffect(() => {
    applyLightTheme();
    const persist = () => {
      window.localStorage.setItem(STORAGE_KEY, "light");
      writeClientPrefCookie(THEME_COOKIE, "light");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(persist, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    persist();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: "light",
      resolvedTheme: "light",
      setTheme: () => {},
    }),
    [],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
