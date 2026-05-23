"use client";

import { useCallback, useEffect, useRef } from "react";
import { getTracker, type TrackEventName, type Tracker } from "@/lib/tracking-sdk";

/**
 * Convenience hook for client components that want to fire bespoke events.
 *
 * ```tsx
 * const track = useTracker();
 * track("add_to_cart", { product_id: "p_1", price: 250 });
 * ```
 */
export function useTracker() {
  const trackerRef = useRef<Tracker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!trackerRef.current) {
      trackerRef.current = getTracker();
    }
  }, []);

  return useCallback(
    (name: TrackEventName, properties: Record<string, unknown> = {}) => {
      if (typeof window === "undefined") return;
      const tracker = trackerRef.current ?? getTracker();
      trackerRef.current = tracker;
      tracker.track(name, properties);
    },
    [],
  );
}
