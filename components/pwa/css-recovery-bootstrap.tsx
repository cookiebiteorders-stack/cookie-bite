"use client";

import { useEffect } from "react";
import { runCssRecoveryIfNeeded } from "@/lib/pwa/css-recovery";

const CHECK_DELAYS_MS = [150, 800, 2500] as const;

/** Detects broken/missing CSS after deploy or stale PWA cache; self-heals once per session. */
export function CssRecoveryBootstrap() {
  useEffect(() => {
    const timers: number[] = [];

    const scheduleChecks = () => {
      for (const delay of CHECK_DELAYS_MS) {
        timers.push(
          window.setTimeout(() => {
            void runCssRecoveryIfNeeded();
          }, delay),
        );
      }
    };

    scheduleChecks();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runCssRecoveryIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
