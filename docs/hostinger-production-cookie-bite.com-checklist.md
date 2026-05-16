# Hostinger Production Checklist — cookie-bite.com only

> For the compact release sheet, see:
> `docs/release-one-pager-cookie-bite.com.md`

## 1) Hostinger App
- [ ] Node.js app deployed from this repo
- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start`
- [ ] Node version: 20+
- [ ] SSL enabled for `cookie-bite.com` (+ optional `www`)

## 2) Environment Variables

مرجع تفصيلي: [`docs/hostinger-environment-variables.md`](hostinger-environment-variables.md)

- [ ] `NEXT_PUBLIC_APP_URL=https://cookie-bite.com`
- [ ] `APP_BASE_URL=https://cookie-bite.com`
- [ ] `COOKIE_BITE_PRIMARY_DOMAIN=cookie-bite.com`
- [ ] Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- [ ] Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, **`CLERK_WEBHOOK_SIGNING_SECRET`** (webhook)
- [ ] Paymob: `PAYMOB_API_KEY`, **`PAYMOB_HMAC_SECRET`** (أو legacy `PAYMOB_HMAC`), **`PAYMOB_INTEGRATION_ID_CARD`**, **`PAYMOB_INTEGRATION_ID_WALLET`**
- [ ] Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (+ `RESEND_REPLY_TO`, `CONTACT_INBOX`, `RESEND_DOMAIN` حسب الحاجة)
- [ ] `INTERNAL_API_SECRET`, **`REVALIDATE_SECRET`**
- [ ] AI (موصى به): `GEMINI_API_KEY`, اختياري `MR_BROWNIE_GEMINI_MODEL` — أو استورد `npm run hostinger:export-gemini-env`
- [ ] CMS (إن استُخدمت المدونة): `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_WEBHOOK_SECRET`
- [ ] اختياري صارم: `COOKIE_BITE_FAIL_ON_MISSING_ENV=true`

## 3) Clerk
- [ ] Primary domain set to `cookie-bite.com`
- [ ] Allowed redirect/callback URLs include:
  - `https://cookie-bite.com/sign-in`
  - `https://cookie-bite.com/sign-up`
  - `https://cookie-bite.com/sso-callback`
  - `https://cookie-bite.com/account`
- [ ] Webhook URL:
  - `https://cookie-bite.com/api/webhooks/clerk`

## 4) Supabase Auth
- [ ] Site URL = `https://cookie-bite.com`
- [ ] Redirect URLs include sign-in/sign-up/sso-callback/account
- [ ] RLS policies verified

## 5) Paymob
- [ ] Callback/Webhook URL:
  - `https://cookie-bite.com/api/webhooks/paymob`
- [ ] Return URL:
  - `https://cookie-bite.com/checkout/paymob-response`

## 6) Resend
- [ ] Domain verified for `cookie-bite.com`
- [ ] Sender valid:
  - `Cookie Bite <orders@cookie-bite.com>`

## 7) Final Validation
- [ ] `npm run build` passes on production config
- [ ] Auth flows work end-to-end
- [ ] Order creation + payment callback works
- [ ] Webhooks receive and process successfully
