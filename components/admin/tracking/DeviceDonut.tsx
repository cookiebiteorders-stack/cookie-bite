"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#b8543b", "#6f9c3c", "#dca44d", "#4f78c3", "#a356b0", "#3aa0a8"];

interface Slice {
  name: string;
  value: number;
}

export function DeviceDonut({
  data,
  title,
}: {
  data: Slice[];
  title?: string;
}) {
  return (
    <div className="space-y-2">
      {title ? (
        <h3 className="text-sm font-semibold text-cb-text-muted">{title}</h3>
      ) : null}
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "#fff",
                fontSize: 12,
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid grid-cols-2 gap-1 text-xs text-cb-text">
        {data.map((slice, i) => (
          <li key={slice.name} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="truncate">{slice.name}</span>
            <span className="ml-auto font-semibold">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
