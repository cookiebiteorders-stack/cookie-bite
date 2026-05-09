"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_COOKIE, writeClientPrefCookie } from "@/lib/preferences/client-cookies";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: ReactNode;
  /** من كوكي `cookie-bite-theme` — يطابق ما رسمه الخادم على `<html>` */
  initialPreference: Theme;
  /** الحلّ الفعلي فاتح/داكن كما في الخادم (مهم عندما initialPreference === "system") */
  initialResolved: "light" | "dark";
};

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "cookie-bite-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  initialPreference,
  initialResolved,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => initialPreference);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() =>
    initialPreference === "system" ? initialResolved : initialPreference === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      if (saved !== initialPreference) setThemeState(saved);
    }
  }, [initialPreference]);

  useEffect(() => {
    setSystemTheme(getSystemTheme());
  }, []);
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? systemTheme : theme;

  useLayoutEffect(() => {
    applyThemeClass(resolvedTheme);
    writeClientPrefCookie(THEME_COOKIE, theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const onChange = () => {
      setSystemTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme],
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
