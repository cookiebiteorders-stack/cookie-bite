/**
 * Lightweight click-stream session recorder.
 *
 * Captures mouse-move samples, clicks, scrolls and page navigations. The
 * resulting JSON stream is small enough to send through the same /api/track
 * endpoint as a `replay_chunk` event with a `frames` array in its properties.
 *
 * For a true DOM replay (rrweb) plug-in your own implementation by reading
 * the `frames` array and rendering them into a sandboxed iframe — but for
 * heuristic UX research this is usually enough.
 */
import { getTracker } from "./tracker";

interface ReplayFrame {
  t: number; // ms since recorder start
  type: "move" | "click" | "scroll" | "nav";
  x?: number;
  y?: number;
  path?: string;
}

const MAX_FRAMES = 600;
const MOVE_SAMPLE_MS = 80;

class SessionRecorder {
  private frames: ReplayFrame[] = [];
  private startedAt = Date.now();
  private lastMoveAt = 0;
  private running = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.running || typeof window === "undefined") return;
    this.running = true;
    window.addEventListener("mousemove", this.handleMove, { passive: true });
    window.addEventListener("click", this.handleClick, { passive: true });
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("popstate", this.handleNav);
    this.flushTimer = setInterval(() => this.flush(), 15_000);
  }

  stop(): void {
    if (!this.running || typeof window === "undefined") return;
    this.running = false;
    window.removeEventListener("mousemove", this.handleMove);
    window.removeEventListener("click", this.handleClick);
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("popstate", this.handleNav);
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush(true);
  }

  private push(frame: ReplayFrame): void {
    if (!this.running) return;
    this.frames.push(frame);
    if (this.frames.length >= MAX_FRAMES) this.flush();
  }

  private handleMove = (e: MouseEvent) => {
    const now = Date.now();
    if (now - this.lastMoveAt < MOVE_SAMPLE_MS) return;
    this.lastMoveAt = now;
    this.push({ t: now - this.startedAt, type: "move", x: e.clientX, y: e.clientY });
  };

  private handleClick = (e: MouseEvent) => {
    this.push({
      t: Date.now() - this.startedAt,
      type: "click",
      x: e.clientX,
      y: e.clientY,
    });
  };

  private handleScroll = () => {
    this.push({
      t: Date.now() - this.startedAt,
      type: "scroll",
      y: window.scrollY,
    });
  };

  private handleNav = () => {
    this.push({
      t: Date.now() - this.startedAt,
      type: "nav",
      path: typeof location !== "undefined" ? location.pathname : "",
    });
  };

  private flush(final = false): void {
    if (this.frames.length === 0) return;
    const frames = this.frames.splice(0, this.frames.length);
    try {
      const tracker = getTracker();
      tracker.track("replay_chunk", { frames, started_at: this.startedAt, final });
    } catch {
      /* tracker not ready yet */
    }
  }
}

let recorder: SessionRecorder | null = null;

export function startReplayRecorder(): SessionRecorder {
  if (!recorder) recorder = new SessionRecorder();
  recorder.start();
  return recorder;
}

export function stopReplayRecorder(): void {
  recorder?.stop();
}
