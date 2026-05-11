import type { LedgerEntry } from "@/lib/financial/types";

function esc(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function ledgerToCsv(rows: LedgerEntry[]): string {
  const header = "date,type,category,title,amount_egp,status,notes,source,id";
  const lines = rows.map((r) =>
    [
      esc(r.ledger_date),
      esc(r.type),
      esc(r.category),
      esc(r.title),
      r.amount_egp,
      esc(r.status),
      esc(r.notes ?? ""),
      esc(r.source),
      esc(r.id),
    ].join(","),
  );
  return `\ufeff${header}\n${lines.join("\n")}\n`;
}
