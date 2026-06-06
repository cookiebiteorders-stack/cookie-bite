"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { LokiTransform } from "@/lib/effects/loki-transform";

const SKIP_LOKI_PREFIXES = ["/checkout", "/cart"];

/** Registers `[data-loki]` elements (hover/click/scroll/auto). Route shell is handled in PageTransition. */
export function LokiBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_LOKI_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 639px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (reduced.matches || narrow.matches || coarse.matches) return;
    if (typeof memory === "number" && memory <= 4) return;

    const loki = new LokiTransform({ particleCount: 32 });
    loki.init();
    return () => loki.dispose();
  }, [pathname]);

  return null;
}
