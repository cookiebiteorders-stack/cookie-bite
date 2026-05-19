/** Normalize Egyptian mobiles to digits with country code (no +). */
export function normalizeEgyptPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `20${digits}`;
  return null;
}
