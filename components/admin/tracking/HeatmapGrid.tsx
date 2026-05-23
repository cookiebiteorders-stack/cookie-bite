"use client";

import { useMemo, useState } from "react";

interface HeatmapCell {
  bucket_x: number;
  bucket_y: number;
  clicks: number;
  rage_clicks: number;
}

interface HeatmapGridProps {
  cells: HeatmapCell[];
  /** grid size N → N×N cells */
  size?: number;
}

const COLOR_STOPS = [
  [255, 255, 255],
  [255, 244, 200],
  [255, 200, 120],
  [255, 140, 60],
  [220, 60, 40],
  [120, 0, 30],
] as const;

function blend(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (COLOR_STOPS.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const a = COLOR_STOPS[idx];
  const b = COLOR_STOPS[Math.min(COLOR_STOPS.length - 1, idx + 1)];
  const mix = a.map((channel, i) => Math.round(channel + (b[i] - channel) * frac));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

export function HeatmapGrid({ cells, size = 50 }: HeatmapGridProps) {
  const [showRage, setShowRage] = useState(false);
  const matrix = useMemo(() => {
    const map: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    let max = 0;
    for (const cell of cells) {
      const value = showRage ? cell.rage_clicks : cell.clicks;
      if (cell.bucket_x >= size || cell.bucket_y >= size) continue;
      map[cell.bucket_y][cell.bucket_x] = value;
      if (value > max) max = value;
    }
    return { map, max };
  }, [cells, size, showRage]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-cb-text-muted">
          {cells.length} buckets · max {matrix.max} clicks
        </p>
        <label className="flex items-center gap-2 text-xs text-cb-text">
          <input
            type="checkbox"
            checked={showRage}
            onChange={(e) => setShowRage(e.target.checked)}
          />
          Show rage clicks only
        </label>
      </div>
      <div
        className="grid overflow-hidden rounded-xl border border-cb-border"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          aspectRatio: "1 / 1",
        }}
      >
        {matrix.map.flatMap((row, y) =>
          row.map((value, x) => (
            <div
              key={`${x}-${y}`}
              title={`x:${x} y:${y} → ${value}`}
              style={{
                backgroundColor: matrix.max > 0 ? blend(value / matrix.max) : "#fff",
              }}
            />
          )),
        )}
      </div>
    </div>
  );
}
