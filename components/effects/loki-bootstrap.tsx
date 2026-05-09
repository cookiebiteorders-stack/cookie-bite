"use client";

import { useEffect } from "react";
import { LokiTransform } from "@/lib/effects/loki-transform";

/** Registers `[data-loki]` elements (hover/click/scroll/auto). Route shell is handled in PageTransition. */
export function LokiBootstrap() {
  useEffect(() => {
    const loki = new LokiTransform({ particleCount: 72 });
    loki.init();
    return () => loki.dispose();
  }, []);
  return null;
}
