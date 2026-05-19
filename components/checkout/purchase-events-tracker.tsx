"use client";

import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/lib/analytics/track-event";

const STORAGE_KEY = "cb-pending-purchase-events";

export type PendingPurchaseLine = {
  product_id: string;
  quantity: number;
};

/** Call before redirecting to thank-you after a successful order. */
export function stashPendingPurchaseEvents(lines: PendingPurchaseLine[]): void {
  if (typeof window === "undefined" || lines.length === 0) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // ignore quota errors
  }
}

type Props = {
  enabled: boolean;
};

/** Fires purchase events once on the thank-you page, then clears storage. */
export function PurchaseEventsTracker({ enabled }: Props) {
  const done = useRef(false);

  useEffect(() => {
    if (!enabled || done.current) return;
    done.current = true;

    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      if (!raw) return;
      const lines = JSON.parse(raw) as PendingPurchaseLine[];
      if (!Array.isArray(lines)) return;
      for (const line of lines) {
        if (!line?.product_id) continue;
        const qty = Math.max(1, Number(line.quantity) || 1);
        for (let i = 0; i < qty; i += 1) {
          trackProductEvent({
            product_id: line.product_id,
            event_type: "purchase",
          });
        }
      }
    } catch {
      // ignore malformed storage
    }
  }, [enabled]);

  return null;
}
