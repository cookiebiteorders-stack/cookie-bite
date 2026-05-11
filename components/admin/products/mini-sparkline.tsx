"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

function seriesFromSeed(seed: number, len: number) {
  let x = seed % 997;
  return Array.from({ length: len }, (_, i) => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const v = 40 + (x % 35) + i * 2;
    return { i, v };
  });
}

type Props = {
  seed: number;
  color: string;
  className?: string;
};

export function MiniSparkline({ seed, color, className }: Props) {
  const data = useMemo(() => seriesFromSeed(seed, 8), [seed]);
  return (
    <div className={className ?? "h-10 w-full"} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#g-${seed})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
