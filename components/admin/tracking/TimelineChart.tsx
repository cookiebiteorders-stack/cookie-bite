"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TimelinePoint {
  bucket: string;
  sessions: number;
  visitors: number;
  pageviews: number;
}

export function TimelineChart({ data }: { data: TimelinePoint[] }) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b8543b" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#b8543b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradPv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6f9c3c" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6f9c3c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="bucket" tickLine={false} stroke="#7d6b56" fontSize={11} />
          <YAxis tickLine={false} axisLine={false} stroke="#7d6b56" fontSize={11} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.1)",
              background: "#fff",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="visitors"
            stroke="#b8543b"
            fill="url(#gradVisitors)"
            strokeWidth={2}
            name="Visitors"
          />
          <Area
            type="monotone"
            dataKey="pageviews"
            stroke="#6f9c3c"
            fill="url(#gradPv)"
            strokeWidth={2}
            name="Page views"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
