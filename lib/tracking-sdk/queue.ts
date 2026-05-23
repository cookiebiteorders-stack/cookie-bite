import type { TrackBatchPayload, TrackEvent } from "./types";

interface QueueOptions {
  endpoint: string;
  token?: string;
  batchSize: number;
  flushInterval: number;
  /** Builds a TrackBatchPayload around the given events. */
  buildBatch: (events: TrackEvent[]) => TrackBatchPayload;
}

/**
 * Buffered event queue.
 *
 * - Events are pushed via `enqueue` and flushed when the buffer reaches
 *   `batchSize`, on a timer (`flushInterval`), and on `pagehide`/`visibilitychange`.
 * - On unload it falls back to `navigator.sendBeacon` to avoid losing events.
 */
export class EventQueue {
  private buffer: TrackEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private destroyed = false;

  constructor(private readonly options: QueueOptions) {}

  start(): void {
    if (this.timer || this.destroyed) return;
    if (typeof window === "undefined") return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.options.flushInterval);
    window.addEventListener("pagehide", this.handleUnload);
    window.addEventListener("visibilitychange", this.handleVisibility);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.handleUnload);
      window.removeEventListener("visibilitychange", this.handleVisibility);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.buffer = [];
  }

  enqueue(event: TrackEvent): void {
    if (this.destroyed) return;
    this.buffer.push(event);
    if (this.buffer.length >= this.options.batchSize) {
      void this.flush();
    }
  }

  size(): number {
    return this.buffer.length;
  }

  async flush(useBeacon = false): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    const events = this.buffer.splice(0, this.buffer.length);
    const payload = this.options.buildBatch(events);
    this.flushing = true;
    try {
      const ok = await this.send(payload, useBeacon);
      if (!ok) {
        // Re-queue events for the next flush attempt.
        this.buffer.unshift(...events);
      }
    } finally {
      this.flushing = false;
    }
  }

  private async send(payload: TrackBatchPayload, useBeacon: boolean): Promise<boolean> {
    if (typeof window === "undefined") return true;
    const body = JSON.stringify(payload);
    const { endpoint, token } = this.options;

    if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      try {
        const blob = new Blob([body], { type: "application/json" });
        return navigator.sendBeacon(endpoint, blob);
      } catch {
        return false;
      }
    }

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["x-tracking-token"] = token;
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body,
        keepalive: true,
        credentials: "same-origin",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private handleUnload = () => {
    void this.flush(true);
  };

  private handleVisibility = () => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      void this.flush(true);
    }
  };
}
