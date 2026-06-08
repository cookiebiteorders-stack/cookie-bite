"use client";

import { useLayoutEffect, useState } from "react";

export type StorefrontHeaderMode = "shell" | "mobile" | "desktop";

const DESKTOP_MQ = "(min-width: 768px)";

/**
 * Shell on SSR + first paint (matches critical CSS), then one real header
 * after layout — avoids hydrating two full headers and prevents mismatch.
 */
export function useStorefrontHeaderMode(): StorefrontHeaderMode {
  const [mode, setMode] = useState<StorefrontHeaderMode>("shell");

  useLayoutEffect(() => {
    const isDesktop = window.matchMedia(DESKTOP_MQ).matches;
    setMode(isDesktop ? "desktop" : "mobile");
  }, []);

  return mode;
}
