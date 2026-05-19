/**
 * Fire-and-forget behavior tracking for recommendations.
 * Safe to call from client components (never throws to caller).
 */
export type TrackEventType = "view" | "add_to_cart" | "purchase" | "wishlist";

export type TrackEventPayload = {
  /** UUID من جدول products */
  product_id?: string;
  /** slug المنتج — يُحلّ إلى UUID في /api/events */
  product_slug?: string;
  event_type: TrackEventType;
  session_id?: string;
  metadata?: Record<string, unknown>;
};

export function trackProductEvent(payload: TrackEventPayload): void {
  if (typeof window === "undefined") return;
  if (!payload.product_id && !payload.product_slug) return;

  const body = JSON.stringify(payload);
  const headers = { "Content-Type": "application/json" };

  if (typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/events", blob);
    return;
  }

  fetch("/api/events", { method: "POST", headers, body, keepalive: true }).catch(
    () => undefined,
  );
}
