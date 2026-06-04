"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TrackerBootstrap = dynamic(
  () => import("@/components/tracking/TrackerBootstrap").then((m) => m.TrackerBootstrap),
  { ssr: false },
);

/** يؤجّل تحميل SDK التتبع حتى idle — لا يحجب LCP على الصفحات العامة. */
export function DeferredTrackerBootstrap() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const enable = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 6000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(enable, 3500);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!ready) return null;
  return <TrackerBootstrap />;
}
