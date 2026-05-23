"use client";

import { useEffect, useState } from "react";

interface RealtimeData {
  ok: boolean;
  active_users: number;
  top_paths: Array<{ path: string; count: number }>;
  devices: Array<{ name: string; value: number }>;
  visitors: Array<{
    visitor_id: string;
    path?: string | null;
    device_type?: string | null;
    last_event_at: number;
  }>;
}

export function RealtimeFeed({ intervalMs = 10_000 }: { intervalMs?: number }) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchOnce = async () => {
      try {
        const res = await fetch("/api/realtime?window=300", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as RealtimeData;
        if (!active) return;
        setData(json);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed");
      }
    };
    void fetchOnce();
    const id = setInterval(fetchOnce, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
            Active right now
          </p>
          <p className="mt-2 text-4xl font-bold text-cb-text-strong">
            {data?.active_users ?? "…"}
          </p>
        </div>
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-pulse rounded-full bg-emerald-500"
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          Realtime feed error: {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <h3 className="text-sm font-semibold text-cb-text-strong">Top live pages</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(data?.top_paths ?? []).map((row) => (
              <li key={row.path} className="flex items-center justify-between gap-3">
                <span className="truncate text-cb-text">{row.path}</span>
                <span className="rounded-full bg-cb-surface-2 px-2 py-0.5 text-xs font-semibold">
                  {row.count}
                </span>
              </li>
            ))}
            {data && data.top_paths.length === 0 ? (
              <li className="text-xs text-cb-text-muted">No active pages.</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
          <h3 className="text-sm font-semibold text-cb-text-strong">Live devices</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(data?.devices ?? []).map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-3">
                <span className="capitalize text-cb-text">{row.name}</span>
                <span className="rounded-full bg-cb-surface-2 px-2 py-0.5 text-xs font-semibold">
                  {row.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
