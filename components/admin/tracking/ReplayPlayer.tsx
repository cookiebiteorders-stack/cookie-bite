"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface ReplayFrame {
  t: number;
  type: "move" | "click" | "scroll" | "nav";
  x?: number;
  y?: number;
  path?: string;
}

interface ReplayPlayerProps {
  sessionId: string;
}

export function ReplayPlayer({ sessionId }: ReplayPlayerProps) {
  const [frames, setFrames] = useState<ReplayFrame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(1);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/analytics/recordings/${sessionId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { frames: ReplayFrame[] };
        if (!cancelled) setFrames(body.frames ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const duration = useMemo(() => {
    if (!frames || frames.length === 0) return 0;
    return frames[frames.length - 1].t;
  }, [frames]);

  useEffect(() => {
    if (!playing || !frames || frames.length === 0) return;
    const tick = () => {
      const start = startedAtRef.current ?? performance.now();
      startedAtRef.current = start;
      const elapsed = (performance.now() - start) * speed + cursor;
      if (elapsed >= duration) {
        setCursor(duration);
        setPlaying(false);
        startedAtRef.current = null;
        return;
      }
      setCursor(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startedAtRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed]);

  const currentFrame = useMemo(() => {
    if (!frames) return null;
    let last: ReplayFrame | null = null;
    for (const frame of frames) {
      if (frame.t > cursor) break;
      last = frame;
    }
    return last;
  }, [frames, cursor]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Error: {error}</div>
    );
  }
  if (!frames) {
    return <div className="text-sm text-cb-text-muted">Loading frames…</div>;
  }
  if (frames.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-cb-border bg-cb-surface-2 p-6 text-center text-sm text-cb-text-muted">
        This session has no recorded frames yet. Enable session replay in your TrackerProvider
        (<code>enableReplay</code>) to capture them.
      </div>
    );
  }

  const moves = frames.filter((f) => f.type === "move").slice(-200);
  const clicks = frames.filter((f) => f.type === "click").filter((f) => f.t <= cursor);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          className="rounded-xl bg-cb-terracotta-dark px-3 py-1.5 font-semibold text-white"
          onClick={() => setPlaying((v) => !v)}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-cb-border bg-cb-surface-2 px-3 py-1.5 font-semibold"
          onClick={() => {
            setPlaying(false);
            setCursor(0);
            startedAtRef.current = null;
          }}
        >
          Reset
        </button>
        <label className="flex items-center gap-1 text-cb-text-muted">
          Speed:
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded-md border border-cb-border bg-white px-1 py-0.5"
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
        </label>
        <span className="ml-auto font-mono text-cb-text-muted">
          {(cursor / 1000).toFixed(1)}s / {(duration / 1000).toFixed(1)}s
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-cb-border bg-[radial-gradient(circle_at_top,_rgba(184,84,59,0.06),_white)]">
        {/* Mouse trail */}
        <svg
          viewBox="0 0 1920 1080"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <polyline
            fill="none"
            stroke="#b8543b"
            strokeWidth="2"
            strokeOpacity="0.4"
            points={moves.map((m) => `${m.x ?? 0},${m.y ?? 0}`).join(" ")}
          />
          {clicks.map((c, i) => (
            <circle
              key={i}
              cx={c.x ?? 0}
              cy={c.y ?? 0}
              r="14"
              fill="rgba(184,84,59,0.25)"
              stroke="rgba(184,84,59,0.6)"
              strokeWidth="2"
            />
          ))}
          {currentFrame && currentFrame.x !== undefined && currentFrame.y !== undefined ? (
            <circle
              cx={currentFrame.x}
              cy={currentFrame.y}
              r="10"
              fill="#b8543b"
              stroke="white"
              strokeWidth="3"
            />
          ) : null}
        </svg>
        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {currentFrame?.path ?? "—"}
        </span>
      </div>
    </div>
  );
}
