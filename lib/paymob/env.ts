/**
 * Paymob HMAC secret used by intention + webhook.
 * Prefer PAYMOB_HMAC_SECRET; PAYMOB_HMAC is legacy alias (Hostinger / older docs).
 *
 * SECURITY: never add a `NEXT_PUBLIC_*` fallback here. This secret verifies
 * webhook/redirect authenticity — if it were ever inlined into the browser
 * bundle, anyone could forge a fake "payment succeeded" callback.
 */
export function resolvePaymobHmacSecret(): string {
  return process.env.PAYMOB_HMAC_SECRET?.trim() ?? process.env.PAYMOB_HMAC?.trim() ?? "";
}
