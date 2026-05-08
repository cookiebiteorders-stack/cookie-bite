"use client";

import { useEffect } from "react";

export function useLockBodyScroll(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof document === "undefined") return;

    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
