"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DeferredTrackerBootstrap } from "@/components/tracking/deferred-tracker-bootstrap";
import { DeferredGA4Tracker } from "@/components/analytics/deferred-ga4-tracker";
import { GtmManager } from "@/components/analytics/gtm-manager";

const WebVitalsReporter = dynamic(
  () =>
    import("@/components/tracking/web-vitals-reporter").then((m) => m.WebVitalsReporter),
  { ssr: false },
);

/** تتبع المتجر — vitals بعد idle حتى لا يحجب TTI. */
export function StorefrontRuntimeEffects() {
  const [vitalsReady, setVitalsReady] = useState(false);

  useEffect(() => {
    const enableVitals = () => setVitalsReady(true);

    if (typeof window.requestIdleCallback === "function") {
      const vitalsId = window.requestIdleCallback(enableVitals, { timeout: 10_000 });
      return () => window.cancelIdleCallback(vitalsId);
    }
    const vitalsTimer = window.setTimeout(enableVitals, 6000);
    return () => window.clearTimeout(vitalsTimer);
  }, []);

  return (
    <>
      <GtmManager />
      <DeferredTrackerBootstrap />
      <DeferredGA4Tracker />
      {vitalsReady ? <WebVitalsReporter /> : null}
    </>
  );
}
