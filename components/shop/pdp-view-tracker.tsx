"use client";

import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/lib/analytics/track-event";

type Props = {
  productUuid: string;
  sessionId?: string;
};

export function PdpViewTracker({ productUuid, sessionId }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (!productUuid || sent.current) return;
    sent.current = true;
    trackProductEvent({
      product_id: productUuid,
      event_type: "view",
      session_id: sessionId,
    });
  }, [productUuid, sessionId]);

  return null;
}
