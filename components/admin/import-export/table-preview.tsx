"use client";

import { cn } from "@/lib/utils";

type Props = {
  headers: string[];
  rows: Record<string, string>[];
  maxRows?: number;
  issues?: Array<{ row: number; message: string }>;
  className?: string;
};

export function TablePreview({ headers, rows, maxRows = 15, issues = [], className }: Props) {
  const display = rows.slice(0, maxRows);
  const issueRows = new Set(issues.map((i) => i.row));

  return (
    <div className={cn("overflow-auto rounded-xl border border-cb-border", className)}>
      <table className="min-w-full text-start text-xs">
        <thead className="sticky top-0 bg-cb-surface-elevated">
          <tr>
            <th className="px-2 py-2 font-bold text-cb-text-muted">#</th>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-2 py-2 font-bold text-cb-text-strong">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {display.map((row, idx) => {
            const rowNum = idx + 2;
            const bad = issueRows.has(rowNum);
            return (
              <tr
                key={idx}
                className={cn(
                  "border-t border-cb-border/60",
                  bad && "bg-red-50/80 dark:bg-red-950/20",
                )}
              >
                <td className="px-2 py-1.5 text-cb-text-muted">{rowNum}</td>
                {headers.map((h) => (
                  <td key={h} className="max-w-[140px] truncate px-2 py-1.5">
                    {row[h] ?? ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > maxRows ? (
        <p className="border-t border-cb-border px-3 py-2 text-[10px] text-cb-text-muted">
          عرض {maxRows} من {rows.length} صف
        </p>
      ) : null}
    </div>
  );
}
