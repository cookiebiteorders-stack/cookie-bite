"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FunnelStepResult } from "@/lib/tracking-server/funnels";

interface FunnelChartProps {
  steps: FunnelStepResult[];
}

export function FunnelChart({ steps }: FunnelChartProps) {
  const data = steps.map((step) => ({
    name: step.name,
    visitors: step.visitors,
    drop: Math.round(step.drop_off_pct * 100),
  }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis type="number" stroke="#7d6b56" fontSize={11} />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            stroke="#7d6b56"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.1)",
              background: "#fff",
              fontSize: 12,
            }}
            formatter={(value, key) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              return key === "drop"
                ? [`${numeric}%`, "Drop-off"]
                : [numeric, "Visitors"];
            }}
          />
          <Bar dataKey="visitors" fill="#b8543b" radius={[0, 8, 8, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
