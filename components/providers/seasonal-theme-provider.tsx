"use client";

import { useEffect } from "react";
import { resolveActiveSeason } from "@/lib/seasonal/config";

export function SeasonalThemeProvider() {
  useEffect(() => {
    const season = resolveActiveSeason();
    document.documentElement.dataset.season = season;
    return () => {
      delete document.documentElement.dataset.season;
    };
  }, []);

  return null;
}
