export type PromptVariant = "a" | "b";

/**
 * تعيين A/B ثابت لكل جلسة/مستخدم عبر هاش بسيط (FNV-1a) — بدون عشوائية متغيرة،
 * فيظل نفس الزائر دائماً على نفس الـ variant طوال المحادثة.
 */
export function assignPromptVariant(seed: string | null | undefined): PromptVariant {
  const key = String(seed ?? "").trim();
  if (!key) return "a";

  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 2 === 0 ? "a" : "b";
}
