/**
 * Signing secret for Clerk → Svix webhooks (per-endpoint `whsec_…` value).
 * Not the same as CLERK_SECRET_KEY (`sk_…`).
 */
export function resolveClerkWebhookSigningSecret(): string | null {
  const raw =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim() ||
    process.env.CLERK_WEBHOOK_SECRET?.trim() ||
    "";
  return raw || null;
}

export function clerkWebhookSecretLooksValid(secret: string): boolean {
  return secret.startsWith("whsec_") && secret.length > 12;
}

export function clerkWebhookSecretMisconfigurationHint(secret: string): string | null {
  if (secret.startsWith("sk_")) {
    return "CLERK_WEBHOOK_SIGNING_SECRET must be the webhook Signing Secret (whsec_…), not CLERK_SECRET_KEY (sk_…).";
  }
  if (secret.startsWith("pk_")) {
    return "CLERK_WEBHOOK_SIGNING_SECRET must be whsec_… from the webhook endpoint, not the publishable key.";
  }
  if (!secret.startsWith("whsec_")) {
    return "CLERK_WEBHOOK_SIGNING_SECRET should start with whsec_ (copy from Clerk → Webhooks → your endpoint → Signing Secret).";
  }
  return null;
}
