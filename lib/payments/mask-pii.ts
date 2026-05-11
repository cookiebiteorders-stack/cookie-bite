/** إخفاء البريد للعرض في لوحة الإدارة */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  const safeLocal = local.length <= 2 ? `${local[0] ?? ""}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

export function shortId(id: string, visible = 8): string {
  if (!id) return "—";
  return id.length <= visible ? id : `${id.slice(0, visible)}…`;
}

export function maskTransactionId(tx: string | null | undefined): string {
  if (!tx) return "—";
  if (tx.length <= 6) return `${tx.slice(0, 2)}…`;
  return `${tx.slice(0, 4)}…${tx.slice(-4)}`;
}
