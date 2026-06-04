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
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const loki = new LokiTransform({ particleCount: 48 });
    loki.init();
    return () => loki.dispose();
  }, [pathname]);

  return null;
}
