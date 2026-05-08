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
- [ ] `NEXT_PUBLIC_APP_URL=https://cookie-bite.com`
- [ ] `APP_BASE_URL=https://cookie-bite.com`
- [ ] `COOKIE_BITE_PRIMARY_DOMAIN=cookie-bite.com`
- [ ] Supabase keys
- [ ] Clerk keys
- [ ] Paymob keys
- [ ] Resend keys
- [ ] `INTERNAL_API_SECRET`, `REVALIDATE_SECRET`

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
