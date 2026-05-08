# Cookie Bite

Production domain: `https://cookie-bite.com`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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

## External Dashboard Settings (Must Match Production Domain)

- Clerk: add `https://cookie-bite.com` as the primary/allowed domain.
- Supabase Auth: Site URL = `https://cookie-bite.com`.
- Paymob webhook/return URLs must use `https://cookie-bite.com`.
- Resend sender domain should be verified for `cookie-bite.com`.
