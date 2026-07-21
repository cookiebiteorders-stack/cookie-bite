# Cookie Bite

Production domain: `https://cookie-bite.com`

## Local Development

```bash
npm install
npm run paymob:normalize-env   # once — maps legacy PAYMOB_* names in .env
npm run dev
```

Open `http://localhost:3000` (Next.js may use `:3001` if 3000 is busy).

### Paymob checkout (card)

1. Ensure `.env` has server-side Paymob keys (`PAYMOB_SECRET_KEY`, `PAYMOB_PUBLIC_KEY`, `PAYMOB_HMAC_SECRET`, integration IDs). Run `npm run paymob:test` to verify.
2. Cart → **Proceed to payment** → fill delivery details → redirects to Paymob hosted checkout.
3. Webhook (production): `https://cookie-bite.com/api/webhooks/paymob`
4. Return URL: `https://cookie-bite.com/checkout/paymob-response`

See also `docs/paymob-webhook-setup.md`.

## Production Build

```bash
npm run build
npm run start
```

The project is configured with:
- `output: "standalone"` for Node hosting environments
- PWA (`next-pwa`)
- security headers in `next.config.ts`

## Hostinger Deployment (Node.js)

1. Build the project:
   ```bash
   npm run build
   ```
2. Upload project files to Hostinger (or deploy via Git integration).
3. In Hostinger Node app settings:
   - Node version: `20+`
   - Start command: `npm run start`
   - Environment: `production`
4. Set production env vars in Hostinger exactly as in `.env` (with production values), especially:
   - `NEXT_PUBLIC_APP_URL=https://cookie-bite.com`
   - `APP_BASE_URL=https://cookie-bite.com`
   - `COOKIE_BITE_PRIMARY_DOMAIN=cookie-bite.com`
5. Point the domain DNS to Hostinger deployment and enable SSL.

### Environment audit & checklist

```bash
npm run hostinger:env-audit    # writes hostinger-production.env (gitignored) for hPanel import
npm run hostinger:checklist    # actionable deploy steps (Clerk, Paymob, cron, …)
```

### Notification cron (Hostinger)

When `REDIS_URL` is unset, order/payment emails use the DB queue. Schedule a cron job every **5 minutes**:

- **URL:** `POST https://cookie-bite.com/api/cron/notification-jobs?limit=20`
- **Header:** `x-internal-secret: <INTERNAL_API_SECRET>`

## Documentation

- **[Full site reference (AR)](docs/WEBSITE_COMPLETE_REFERENCE.md)** — pages, API routes, database, security, env vars, and architecture.

## External Dashboard Settings (Must Match Production Domain)

- Clerk: add `https://cookie-bite.com` as the primary/allowed domain.
- Supabase Auth: Site URL = `https://cookie-bite.com`.
- Paymob webhook/return URLs must use `https://cookie-bite.com`.
- Resend sender domain should be verified for `cookie-bite.com`.
