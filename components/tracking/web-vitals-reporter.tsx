"use client";

import { useEffect } from "react";
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";
import { trackGa4Event } from "@/lib/analytics/ga4";

function reportWebVital(metric: Metric) {
  const value =
    metric.name === "CLS"
      ? Math.round(metric.value * 1000)
      : Math.round(metric.value);

  trackGa4Event("web_vitals", {
    metric_name: metric.name,
    metric_value: value,
    metric_rating: metric.rating,
    metric_id: metric.id,
    navigation_type: metric.navigationType ?? undefined,
  });
}

/** Reports LCP, CLS, and INP to GA4 when NEXT_PUBLIC_GA_ID is set. */
export function WebVitalsReporter() {
  useEffect(() => {
    onCLS(reportWebVital);
    onINP(reportWebVital);
    onLCP(reportWebVital);
  }, []);

  return null;
}
