/**
 * حاوية Smart CAPTCHA (Cloudflare Turnstile عبر Clerk).
 * بدون هذا العنصر يبحث الـ SDK عن `#clerk-captcha` ولا يجده فيُسجّل خطأ ويعود لـ Invisible CAPTCHA.
 *
 * @see https://clerk.com/docs/guides/development/custom-flows/authentication/bot-sign-up-protection
 */
export function ClerkSmartCaptcha() {
  return (
    <div
      id="clerk-captcha"
      className="flex min-h-0 w-full max-w-full justify-center py-1"
      data-cl-theme="auto"
      data-cl-size="flexible"
      data-cl-language="auto"
    />
  );
}
