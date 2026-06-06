import type { SavedPaymentMethodRow } from "@/lib/db/payment-methods";

export function formatPaymentMethodSummary(
  row: SavedPaymentMethodRow,
  translate: (key: string) => string,
): string {
  const typeLabel = translate(`accountPaymentMethods.types.${row.method_type}`);
  if (row.method_type === "card") {
    const last4 = row.card_last4 ? ` •••• ${row.card_last4}` : "";
    return `${row.label} (${typeLabel}${last4})`;
  }
  if (row.method_type === "wallet" && row.wallet_provider) {
    const provider =
      translate(`accountPaymentMethods.walletProviders.${row.wallet_provider}`) ||
      row.wallet_provider;
    const hint = row.account_hint ? ` — ${row.account_hint}` : "";
    return `${row.label} · ${provider}${hint}`;
  }
  if (row.account_hint) {
    return `${row.label} · ${typeLabel} — ${row.account_hint}`;
  }
  return `${row.label} · ${typeLabel}`;
}
