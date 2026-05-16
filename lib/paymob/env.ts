/**
 * Paymob HMAC secret used by intention + webhook.
 * Prefer PAYMOB_HMAC_SECRET; PAYMOB_HMAC is legacy alias (Hostinger / older docs).
 */
export function resolvePaymobHmacSecret(): string {
  return (
    process.env.PAYMOB_HMAC_SECRET?.trim() ??
    process.env.PAYMOB_HMAC?.trim() ??
    ""
  );
}
