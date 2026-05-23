/**
 * Cookie Bite — first-party tracking SDK.
 *
 * Public entry point. Consumers should import from `@/lib/tracking-sdk`:
 *
 * ```ts
 * import { getTracker } from "@/lib/tracking-sdk";
 *
 * const tracker = getTracker({ userId: clerkUserId });
 * tracker.track("add_to_cart", { product_id: "p_123", price: 250 });
 * ```
 */

export { Tracker, getTracker, resetTrackerForTests } from "./tracker";
export { EventQueue } from "./queue";
export { resolveIdentity, touchSession } from "./session";
export { captureUTM, parseUTMFromSearch } from "./utm";
export { readDeviceContext, parseUserAgent, isBot, deviceTypeFromWidth } from "./device";
export { computeFingerprint } from "./fingerprint";
export { uuid, shortId } from "./uuid";
export type {
  TrackEvent,
  TrackBatchPayload,
  TrackEventName,
  TrackerConfig,
  DeviceContext,
  PageContext,
  VisitorContext,
  UTMParams,
  DeviceType,
} from "./types";
