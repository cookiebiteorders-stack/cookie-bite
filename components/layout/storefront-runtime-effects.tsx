"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { DeferredTrackerBootstrap } from "@/components/tracking/deferred-tracker-bootstrap";
import { DeferredGA4Tracker } from "@/components/analytics/deferred-ga4-tracker";
import { LokiSvgFilters } from "@/components/effects/loki-svg-filters";

const WebVitalsReporter = dynamic(
  () =>
    import("@/components/tracking/web-vitals-reporter").then((m) => m.WebVitalsReporter),
  { ssr: false },
);

const LokiBootstrap = dynamic(
  () => import("@/components/effects/loki-bootstrap").then((m) => m.LokiBootstrap),
  { ssr: false },
);

/** تأثيرات وتتبع المتجر فقط — لا تُحمَّل على sign-in / maintenance / admin. */
export function StorefrontRuntimeEffects() {
  const [vitalsReady, setVitalsReady] = useState(false);

  useEffect(() => {
    const enable = () => setVitalsReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 10_000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 6000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <LokiSvgFilters />
      <LokiBootstrap />
      <DeferredTrackerBootstrap />
      <DeferredGA4Tracker />
      {vitalsReady ? <WebVitalsReporter /> : null}
    </>
  );
}
