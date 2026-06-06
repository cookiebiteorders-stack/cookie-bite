"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const GA4Tracker = dynamic(
  () => import("@/components/analytics/ga4-tracker").then((m) => m.GA4Tracker),
  { ssr: false },
);

/** GA4 + مستمعي scroll/click — بعد idle حتى لا يحجبوا LCP. */
export function DeferredGA4Tracker() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 8000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 4500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;
  return <GA4Tracker />;
}
