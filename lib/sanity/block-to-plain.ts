/** استخراج نص تقريبي من حقول portable text (Sanity block content). */
export function portableBlocksToPlain(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const parts: string[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const o = b as { _type?: string; children?: unknown[] };
    if (o._type !== "block" || !Array.isArray(o.children)) continue;
    for (const ch of o.children) {
      if (ch && typeof ch === "object" && "text" in ch) {
        parts.push(String((ch as { text?: string }).text ?? ""));
      }
    }
    parts.push("\n");
  }
  return parts.join("").trim();
}
