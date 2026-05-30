"use client";

import { useEffect } from "react";
import { runCssRecoveryIfNeeded } from "@/lib/pwa/css-recovery";

/** Detects broken/missing CSS after deploy or stale PWA cache; self-heals once per session. */
export function CssRecoveryBootstrap() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runCssRecoveryIfNeeded();
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
