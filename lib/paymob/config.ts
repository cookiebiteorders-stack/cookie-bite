/**
 * Paymob environment + URL helpers (Intention API + Unified Checkout).
 * Secrets stay server-side only — never expose in client bundles.
 */

import { resolvePaymobHmacSecret } from "@/lib/paymob/env";

export type PaymobConfigStatus = {
  secretKey: boolean;
  publicKey: boolean;
  hmacSecret: boolean;
  integrationCard: boolean;
  integrationWallet: boolean;
  appBaseUrl: boolean;
};

/**
 * Secret key for Intention API — Authorization: Token <secret>
 * SECURITY: never read a `NEXT_PUBLIC_*` name here. Any `NEXT_PUBLIC_`
 * prefixed variable is inlined into the browser bundle by Next.js wherever
 * referenced, so a legacy `NEXT_PUBLIC_PAYMOB_SECRET_KEY` fallback would be a
 * live secret-leak landmine the moment this module is ever imported (even
 * transitively) from a Client Component. Use `npm run paymob:normalize-env`
 * to migrate any legacy `.env` names to the canonical server-only ones below.
 */
export function resolvePaymobSecretKey(): string {
  return process.env.PAYMOB_SECRET_KEY?.trim() ?? process.env.PAYMOB_API_KEY?.trim() ?? "";
}

/**
 * Public key for Unified Checkout redirect URL (pk_test_* / pk_live_*).
 * This one is genuinely meant to be public (Paymob's own naming), but is
 * still resolved server-side and only ever handed to the client inside an
 * API response — never baked into the JS bundle via a `NEXT_PUBLIC_*` name.
 */
export function resolvePaymobPublicKey(): string {
  return process.env.PAYMOB_PUBLIC_KEY?.trim() ?? "";
}

export function resolvePaymobIntegrationIdCard(): number {
  return Number(
    process.env.PAYMOB_INTEGRATION_ID_CARD ??
      process.env.PAYMOB_CARD_INTEGRATION_ID,
  );
}

export function resolvePaymobIntegrationIdWallet(): number {
  return Number(
    process.env.PAYMOB_INTEGRATION_ID_WALLET ??
      process.env.PAYMOB_WALLET_INTEGRATION_ID,
  );
}

/** Regional origin — strips trailing /api from PAYMOB_API_URL when set. */
export function paymobOrigin(): string {
  const raw = process.env.PAYMOB_API_URL?.trim();
  if (raw) {
    return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return "https://accept.paymob.com";
}

export function resolveAppBaseUrl(): string {
  const base =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  return base.replace(/\/$/, "") || "http://localhost:3000";
}

export function paymobNotificationUrl(): string {
  return `${resolveAppBaseUrl()}/api/webhooks/paymob`;
}

export function paymobRedirectionUrl(): string {
  return `${resolveAppBaseUrl()}/checkout/paymob-response`;
}

export function paymobUnifiedCheckoutUrl(clientSecret: string): string {
  const params = new URLSearchParams({ clientSecret });
  const publicKey = resolvePaymobPublicKey();
  if (publicKey) params.set("publicKey", publicKey);
  return `${paymobOrigin()}/unifiedcheckout/?${params.toString()}`;
}

export function getPaymobConfigStatus(): PaymobConfigStatus {
  const card = resolvePaymobIntegrationIdCard();
  const wallet = resolvePaymobIntegrationIdWallet();
  const appBase = resolveAppBaseUrl();
  return {
    secretKey: Boolean(resolvePaymobSecretKey()),
    publicKey: Boolean(resolvePaymobPublicKey()),
    hmacSecret: Boolean(resolvePaymobHmacSecret()),
    integrationCard: Number.isFinite(card) && card > 0,
    integrationWallet: Number.isFinite(wallet) && wallet > 0,
    appBaseUrl: appBase.length > 0 && !appBase.includes("localhost"),
  };
}

/**
 * PAY-05: Validate Paymob environment consistency.
 * Ensures all credentials are from the same environment (test vs live).
 * Returns null if valid, or an error message describing the inconsistency.
 */
export function validatePaymobEnvConsistency(): string | null {
  const secretKey = resolvePaymobSecretKey();
  const publicKey = resolvePaymobPublicKey();
  
  if (!secretKey || !publicKey) {
    return "Missing PAYMOB_SECRET_KEY or PAYMOB_PUBLIC_KEY";
  }

  // Check if keys are from the same environment
  const isTestSecret = secretKey.startsWith("sk_test_");
  const isLiveSecret = secretKey.startsWith("sk_live_");
  const isTestPublic = publicKey.startsWith("pk_test_");
  const isLivePublic = publicKey.startsWith("pk_live_");

  if (isTestSecret && isLivePublic) {
    return "PAYMOB_SECRET_KEY is test mode but PAYMOB_PUBLIC_KEY is live mode";
  }
  if (isLiveSecret && isTestPublic) {
    return "PAYMOB_SECRET_KEY is live mode but PAYMOB_PUBLIC_KEY is test mode";
  }

  // Check if base URL matches environment
  const baseUrl = paymobOrigin();
  const isTestUrl = baseUrl.includes("accept.paymob.com") && !baseUrl.includes("live");
  const isLiveUrl = baseUrl.includes("live") || baseUrl.includes("production");

  if (isTestSecret && isLiveUrl) {
    return "PAYMOB_SECRET_KEY is test mode but PAYMOB_API_URL points to live environment";
  }
  if (isLiveSecret && isTestUrl) {
    return "PAYMOB_SECRET_KEY is live mode but PAYMOB_API_URL points to test environment";
  }

  return null; // All checks passed
}

export function resolvePaymobIntegrationId(paymentMethod: "card" | "wallet"): number | null {
  const id = paymentMethod === "wallet"
    ? resolvePaymobIntegrationIdWallet()
    : resolvePaymobIntegrationIdCard();
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function hasPaymobOnlineCheckout(paymentMethod: "card" | "wallet"): boolean {
  const status = getPaymobConfigStatus();
  const integrationOk =
    paymentMethod === "wallet" ? status.integrationWallet : status.integrationCard;
  return (
    status.secretKey &&
    status.hmacSecret &&
    status.publicKey &&
    integrationOk
  );
}
