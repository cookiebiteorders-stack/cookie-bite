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

    let idleId: number | undefined;
    const start = () => scheduleChecks();
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(start, { timeout: 4000 });
    } else {
      timers.push(window.setTimeout(start, 1200));
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void runCssRecoveryIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      timers.forEach((id) => window.clearTimeout(id));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
