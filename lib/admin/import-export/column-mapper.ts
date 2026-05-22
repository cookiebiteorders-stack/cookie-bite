import type { ColumnDef, ColumnMapping } from "@/lib/admin/import-export/types";

export type { ColumnMapping };

/** يطابق رؤوس الملف مع مفاتيح القالب (تطابق تام أو جزئي). */
export function suggestColumnMapping(
  fileHeaders: string[],
  templateColumns: ColumnDef[],
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

  for (const col of templateColumns) {
    const keyNorm = norm(col.key);
    const labelNorm = norm(col.label);
    const hit = fileHeaders.find((h) => {
      const hn = norm(h);
      return hn === keyNorm || hn === labelNorm || hn.includes(keyNorm) || keyNorm.includes(hn);
    });
    if (hit) mapping[col.key] = hit;
  }
  return mapping;
}

export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const [targetKey, sourceHeader] of Object.entries(mapping)) {
      if (!sourceHeader) continue;
      const v = row[sourceHeader];
      if (v !== undefined && v !== "") out[targetKey] = v;
    }
    return out;
  });
}
