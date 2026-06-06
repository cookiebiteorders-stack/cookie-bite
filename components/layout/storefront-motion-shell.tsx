"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useState } from "react";

const MotionShellInner = dynamic(
  () =>
    import("@/components/layout/storefront-motion-shell-inner").then((m) => ({
      default: m.StorefrontMotionShellInner,
    })),
  { ssr: true },
);

function prefersLightMotion(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia("(max-width: 639px)").matches) return true;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" && memory <= 4;
}

/** غلاف الحركة — يُتخطى على الموبايل لتقليل حزمة motion/layout. */
export function StorefrontMotionShell({ children }: { children: React.ReactNode }) {
  const [light, setLight] = useState(true);

  useLayoutEffect(() => {
    setLight(prefersLightMotion());
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 639px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setLight(prefersLightMotion());
    reduced.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    coarse.addEventListener("change", sync);
    return () => {
      reduced.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);

  if (light) {
    return <div className="cb-page-route-shell min-h-0 w-full">{children}</div>;
  }

  return <MotionShellInner>{children}</MotionShellInner>;
}
