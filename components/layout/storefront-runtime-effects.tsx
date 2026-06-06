"use client";

import { LokiBootstrap } from "@/components/effects/loki-bootstrap";
import { DeferredTrackerBootstrap } from "@/components/tracking/deferred-tracker-bootstrap";
import { WebVitalsReporter } from "@/components/tracking/web-vitals-reporter";

/** تأثيرات وتتبع المتجر فقط — لا تُحمَّل على sign-in / maintenance. */
export function StorefrontRuntimeEffects() {
  return (
    <>
      <LokiBootstrap />
      <DeferredTrackerBootstrap />
      <WebVitalsReporter />
    </>
  );
}
