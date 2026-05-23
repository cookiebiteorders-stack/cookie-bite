/**
 * Tracking SDK — types
 * Shared between client SDK, /api/track and the analytics dashboard.
 */

export type DeviceType = "mobile" | "tablet" | "desktop";

export type CoreEventName =
  | "page_view"
  | "session_start"
  | "session_end"
  | "click"
  | "scroll"
  | "form_start"
  | "form_submit"
  | "form_field_focus"
  | "download"
  | "video_play"
  | "video_pause";

export type EcommerceEventName =
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "add_payment_info"
  | "purchase";

export type EngagementEventName =
  | "rage_click"
  | "dead_click"
  | "time_on_page"
  | "hover"
  | "search"
  | "filter_apply"
  | "heartbeat"
  | "replay_chunk";

export type TrackEventName =
  | CoreEventName
  | EcommerceEventName
  | EngagementEventName
  | (string & {});

export interface UTMParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
}

export interface DeviceContext {
  device_type: DeviceType;
  browser?: string;
  browser_version?: string;
  os?: string;
  os_version?: string;
  screen_width?: number;
  screen_height?: number;
  viewport_width?: number;
  viewport_height?: number;
  device_pixel_ratio?: number;
  language?: string;
  timezone?: string;
  user_agent?: string;
  is_bot?: boolean;
}

export interface VisitorContext {
  visitor_id: string;
  session_id: string;
  fingerprint?: string;
  user_id?: string | null;
}

export interface PageContext {
  url: string;
  path: string;
  hash?: string | null;
  search?: string | null;
  title?: string | null;
  referrer?: string | null;
}

export interface TrackEvent {
  /** client-generated unique id */
  event_id: string;
  /** event name (page_view, click, ...) */
  name: TrackEventName;
  /** ISO timestamp */
  timestamp: string;
  visitor_id: string;
  session_id: string;
  user_id?: string | null;
  page: PageContext;
  device: DeviceContext;
  utm?: UTMParams;
  /** Free-form event metadata (kept in JSONB `properties` column). */
  properties?: Record<string, unknown>;
}

export interface TrackBatchPayload {
  /** SDK version (for backwards compatibility). */
  sdk: string;
  /** Visitor + session identity attached once at batch-level. */
  visitor: VisitorContext;
  /** Newest device snapshot at batch creation. */
  device: DeviceContext;
  /** Newest page snapshot at batch creation. */
  page: PageContext;
  /** Newest UTM snapshot (sticky for the session). */
  utm?: UTMParams;
  events: TrackEvent[];
}

export interface TrackerConfig {
  /** Endpoint to POST batches to (default `/api/track`). */
  endpoint?: string;
  /** Optional auth token sent as `x-tracking-token` header. */
  token?: string;
  /** Max events per batch (default 20). */
  batchSize?: number;
  /** Flush interval in ms (default 5000). */
  flushInterval?: number;
  /** Inactivity threshold before considering a session expired (default 30min). */
  sessionTimeoutMs?: number;
  /** Heartbeat interval in ms (default 20s). */
  heartbeatInterval?: number;
  /** Disable tracking entirely (e.g. when user opts-out). */
  disabled?: boolean;
  /** Disable tracking only for visitors flagged as bots. */
  filterBots?: boolean;
  /** Enable lightweight session replay events (default false — heavy). */
  enableReplay?: boolean;
  /** Optional logical user id to attach to events (e.g. Clerk userId). */
  userId?: string | null;
}
