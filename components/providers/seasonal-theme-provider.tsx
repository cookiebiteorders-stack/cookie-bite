"use client";

import { useEffect } from "react";
import { resolveActiveSeason } from "@/lib/seasonal/config";

export function SeasonalThemeProvider() {
  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.season = resolveActiveSeason();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(apply, { timeout: 2500 });
      return () => {
        window.cancelIdleCallback(id);
        delete document.documentElement.dataset.season;
      };
    }
    const timer = window.setTimeout(apply, 0);
    return () => {
      window.clearTimeout(timer);
      delete document.documentElement.dataset.season;
    };
  }, []);

  return null;
}
