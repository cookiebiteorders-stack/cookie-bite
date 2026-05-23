import type {
  DeviceContext,
  PageContext,
  TrackBatchPayload,
  TrackEvent,
  TrackEventName,
  TrackerConfig,
  UTMParams,
  VisitorContext,
} from "./types";
import { readDeviceContext } from "./device";
import { captureUTM } from "./utm";
import { EventQueue } from "./queue";
import { resolveIdentity, touchSession } from "./session";
import { shortId } from "./uuid";
import { describeElement } from "./dom";

const SDK_VERSION = "1.0.0";
const DEFAULTS: Required<
  Pick<
    TrackerConfig,
    "endpoint" | "batchSize" | "flushInterval" | "sessionTimeoutMs" | "heartbeatInterval"
  >
> = {
  endpoint: "/api/track",
  batchSize: 20,
  flushInterval: 5_000,
  sessionTimeoutMs: 30 * 60 * 1000,
  heartbeatInterval: 20_000,
};

const SCROLL_BUCKETS = [25, 50, 75, 90, 100];

export class Tracker {
  readonly visitor: VisitorContext;
  readonly device: DeviceContext;
  readonly utm: UTMParams | undefined;
  private page: PageContext;
  private readonly config: Required<
    Pick<
      TrackerConfig,
      "endpoint" | "batchSize" | "flushInterval" | "sessionTimeoutMs" | "heartbeatInterval"
    >
  > & {
    token?: string;
    disabled: boolean;
    filterBots: boolean;
    enableReplay: boolean;
  };
  private readonly queue: EventQueue;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private timeOnPageTimer: ReturnType<typeof setInterval> | null = null;
  private maxScrollPct = 0;
  private firedScrollBuckets = new Set<number>();
  private pageEnteredAt = Date.now();
  private clickHistory: Array<{ x: number; y: number; t: number }> = [];
  private userId: string | null = null;
  private started = false;

  constructor(config: TrackerConfig = {}) {
    this.config = {
      ...DEFAULTS,
      token: config.token,
      disabled: Boolean(config.disabled),
      filterBots: config.filterBots ?? true,
      enableReplay: Boolean(config.enableReplay),
      endpoint: config.endpoint ?? DEFAULTS.endpoint,
      batchSize: config.batchSize ?? DEFAULTS.batchSize,
      flushInterval: config.flushInterval ?? DEFAULTS.flushInterval,
      sessionTimeoutMs: config.sessionTimeoutMs ?? DEFAULTS.sessionTimeoutMs,
      heartbeatInterval: config.heartbeatInterval ?? DEFAULTS.heartbeatInterval,
    };
    this.userId = config.userId ?? null;

    const identity = resolveIdentity({ sessionTimeoutMs: this.config.sessionTimeoutMs });
    this.visitor = {
      visitor_id: identity.visitor_id,
      session_id: identity.session_id,
      fingerprint: identity.fingerprint,
      user_id: this.userId,
    };
    this.device = readDeviceContext();
    this.utm = captureUTM();
    this.page = readPageContext();

    this.queue = new EventQueue({
      endpoint: this.config.endpoint,
      token: this.config.token,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      buildBatch: (events) => this.buildBatch(events),
    });

    if (identity.is_new_session && !this.shouldSkip()) {
      this.track("session_start", {
        is_new_visitor: identity.is_new_visitor,
        referrer: this.page.referrer ?? null,
      });
    }
  }

  start(): void {
    if (this.started || this.shouldSkip()) return;
    this.started = true;
    this.queue.start();
    this.attachListeners();
    this.startHeartbeat();
    if (this.config.enableReplay) {
      void import("./recorder").then(({ startReplayRecorder }) => startReplayRecorder());
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.queue.stop();
    this.detachListeners();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.timeOnPageTimer) {
      clearInterval(this.timeOnPageTimer);
      this.timeOnPageTimer = null;
    }
  }

  destroy(): void {
    this.stop();
    this.queue.destroy();
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
    this.visitor.user_id = userId;
  }

  /**
   * Notify the tracker that the SPA has navigated to a new page.
   * Fires `time_on_page` for the previous URL, resets scroll buckets, and
   * fires a new `page_view`.
   */
  trackPageView(overrides?: Partial<PageContext> & { properties?: Record<string, unknown> }): void {
    if (this.shouldSkip()) return;
    this.flushPageTimers();
    this.page = { ...readPageContext(), ...overrides };
    this.pageEnteredAt = Date.now();
    this.maxScrollPct = 0;
    this.firedScrollBuckets.clear();
    this.track("page_view", overrides?.properties ?? {});
  }

  track(name: TrackEventName, properties: Record<string, unknown> = {}): void {
    if (this.shouldSkip()) return;
    const event: TrackEvent = {
      event_id: shortId("evt"),
      name,
      timestamp: new Date().toISOString(),
      visitor_id: this.visitor.visitor_id,
      session_id: this.visitor.session_id,
      user_id: this.userId,
      page: { ...this.page },
      device: this.device,
      utm: this.utm,
      properties,
    };
    touchSession();
    this.queue.enqueue(event);
  }

  async flush(useBeacon = false): Promise<void> {
    await this.queue.flush(useBeacon);
  }

  private shouldSkip(): boolean {
    if (this.config.disabled) return true;
    if (this.config.filterBots && this.device.is_bot) return true;
    return false;
  }

  private buildBatch(events: TrackEvent[]): TrackBatchPayload {
    return {
      sdk: SDK_VERSION,
      visitor: this.visitor,
      device: this.device,
      page: this.page,
      utm: this.utm,
      events,
    };
  }

  private attachListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("click", this.handleClick, true);
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    document.addEventListener("submit", this.handleSubmit, true);
    document.addEventListener("focusin", this.handleFocusIn, true);
  }

  private detachListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("click", this.handleClick, true);
    window.removeEventListener("scroll", this.handleScroll);
    document.removeEventListener("submit", this.handleSubmit, true);
    document.removeEventListener("focusin", this.handleFocusIn, true);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer || typeof window === "undefined") return;
    this.heartbeatTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      this.track("heartbeat", {
        seconds_on_page: Math.round((Date.now() - this.pageEnteredAt) / 1000),
      });
    }, this.config.heartbeatInterval);

    // Lightweight time-on-page emitter every 15s for accuracy on the server.
    this.timeOnPageTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      this.track("time_on_page", {
        seconds: Math.round((Date.now() - this.pageEnteredAt) / 1000),
      });
    }, 15_000);
  }

  private flushPageTimers(): void {
    if (!this.started) return;
    const seconds = Math.round((Date.now() - this.pageEnteredAt) / 1000);
    if (seconds > 0) {
      this.track("time_on_page", { seconds, final: true });
    }
  }

  private handleClick = (e: MouseEvent) => {
    if (this.shouldSkip()) return;
    const target = e.target as Element | null;
    if (!target) return;
    const properties = {
      ...describeElement(target),
      x: e.clientX,
      y: e.clientY,
      page_x: e.pageX,
      page_y: e.pageY,
      vw: window.innerWidth,
      vh: window.innerHeight,
      button: e.button,
    };
    this.track("click", properties);

    // Rage click detection: 3+ clicks within 1s near the same coordinates.
    const now = Date.now();
    this.clickHistory.push({ x: e.clientX, y: e.clientY, t: now });
    this.clickHistory = this.clickHistory.filter((c) => now - c.t < 1_000);
    if (this.clickHistory.length >= 3) {
      const dx = Math.max(...this.clickHistory.map((c) => c.x)) -
        Math.min(...this.clickHistory.map((c) => c.x));
      const dy = Math.max(...this.clickHistory.map((c) => c.y)) -
        Math.min(...this.clickHistory.map((c) => c.y));
      if (dx < 40 && dy < 40) {
        this.track("rage_click", {
          ...describeElement(target),
          count: this.clickHistory.length,
        });
        this.clickHistory = [];
      }
    }
  };

  private handleScroll = () => {
    if (this.shouldSkip()) return;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const pct = Math.min(100, Math.round((window.scrollY / docHeight) * 100));
    if (pct <= this.maxScrollPct) return;
    this.maxScrollPct = pct;
    for (const bucket of SCROLL_BUCKETS) {
      if (pct >= bucket && !this.firedScrollBuckets.has(bucket)) {
        this.firedScrollBuckets.add(bucket);
        this.track("scroll", { depth: bucket, max_pct: this.maxScrollPct });
      }
    }
  };

  private handleSubmit = (e: Event) => {
    if (this.shouldSkip()) return;
    const form = e.target as HTMLFormElement | null;
    if (!form) return;
    this.track("form_submit", {
      ...describeElement(form),
      action: form.action || null,
      method: (form.method || "").toLowerCase() || null,
      field_count: form.elements?.length ?? 0,
    });
  };

  private handleFocusIn = (e: Event) => {
    if (this.shouldSkip()) return;
    const target = e.target as Element | null;
    if (!target) return;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    this.track("form_field_focus", {
      ...describeElement(target),
      input_type: target instanceof HTMLInputElement ? target.type : "textarea",
    });
  };
}

function readPageContext(): PageContext {
  if (typeof window === "undefined") {
    return { url: "", path: "" };
  }
  return {
    url: window.location.href,
    path: window.location.pathname,
    hash: window.location.hash || null,
    search: window.location.search || null,
    title: document.title || null,
    referrer: document.referrer || null,
  };
}

let singleton: Tracker | null = null;

export function getTracker(config?: TrackerConfig): Tracker {
  if (typeof window === "undefined") {
    throw new Error("Tracker is browser-only");
  }
  if (!singleton) {
    singleton = new Tracker(config);
    singleton.start();
  } else if (config?.userId !== undefined) {
    singleton.setUserId(config.userId);
  }
  return singleton;
}

export function resetTrackerForTests(): void {
  singleton?.destroy();
  singleton = null;
}
