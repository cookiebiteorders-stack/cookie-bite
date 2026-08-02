# Deployment Requirements

This document outlines the production deployment requirements for the Cookie Bite application.

## Node.js Version

**Required:** Node.js >= 20.0.0

The application requires Node.js version 20.0.0 or higher. This is enforced in `package.json`:

```json
"engines": {
  "node": ">=20.0.0"
}
```

### Verification

Check your Node version before deployment:
```bash
node --version
```

### Hostinger Configuration

If deploying to Hostinger:
1. Go to hPanel → Hosting → Manage
2. Navigate to Node.js settings
3. Ensure Node.js version is set to 20.x or higher
4. If version < 20 is the only option, consider migrating to a host that supports Node 20+

## Native Dependencies (sharp)

The application uses `sharp` (^0.35.3), a native module that requires the libvips library.

### System Requirements

For successful installation and runtime, ensure your environment has:

**Ubuntu/Debian:**
```bash
apt-get update
apt-get install -y libvips-dev
```

**Alpine Linux:**
```bash
apk add vips-dev
```

**CentOS/RHEL:**
```bash
yum install vips-devel
```

### Docker Deployment

Use a base image that includes libvips or install it during build:

```dockerfile
FROM node:20-bullseye-slim

# Install libvips
RUN apt-get update && apt-get install -y libvips-dev && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build application
RUN npm run build
```

### Hostinger Deployment

Hostinger's shared hosting may not have libvips pre-installed. If you encounter sharp installation errors:

1. Contact Hostinger support to request libvips installation
2. Or use a VPS/dedicated server where you can install system dependencies
3. Or consider using a container-based deployment solution

### Verification

Test sharp installation:
```bash
npm ci
node -e "require('sharp'); console.log('sharp works')"
```

## Production Start Process

The application uses a custom start script (`server.mjs`) that handles standalone server resolution.

### Start Scripts

```json
"start": "node server.mjs",
"start:standalone": "node .next/standalone/server.js"
```

### Build Process

1. Run build: `npm run build`
2. Postbuild scripts automatically:
   - Stub legacy polyfills
   - Copy standalone assets to `.next/standalone/public/`
   - Verify standalone assets

### Production Startup

The `server.mjs` entrypoint:
1. Validates critical secrets (INTERNAL_API_SECRET, REVALIDATE_SECRET, PAYMOB_HMAC_SECRET, REDIS_URL)
2. Resolves standalone server location (handles multiple deployment scenarios)
3. Warns about missing standalone assets
4. Validates production environment variables
5. Starts the standalone Next.js server

### Environment Variables

Critical production variables (validated at startup):
- NEXT_PUBLIC_APP_URL
- APP_BASE_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- PAYMOB_API_KEY
- PAYMOB_INTEGRATION_ID_CARD
- PAYMOB_INTEGRATION_ID_WALLET
- PAYMOB_HMAC_SECRET
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- INTERNAL_API_SECRET
- REVALIDATE_SECRET
- REDIS_URL

See `.env.example` for complete variable list.

### Deployment Checklist

- [ ] Node.js version >= 20.0.0
- [ ] libvips installed (for sharp)
- [ ] All environment variables configured
- [ ] `npm run build` completes successfully
- [ ] Standalone assets verified in `.next/standalone/`
- [ ] Start command configured: `node server.mjs`
- [ ] Port configured (default: 3000, set via PORT env var)

## Troubleshooting

### Build Fails with sharp Error

```
Error: sharp: Installation failed
```

**Solution:** Install libvips system library (see above)

### Server Fails to Start: "standalone server not found"

**Solution:** Run `npm run build` before starting. Ensure build completes successfully.

### Missing Environment Variables Warning

**Solution:** Configure all required environment variables in your hosting platform's environment settings.

### Hostinger-Specific Issues

If deploying to Hostinger:
- Use the `hostinger:env-audit` script to generate required env vars
- Run `npm run hostinger:checklist` for deployment verification
- Ensure build command in Hostinger is set to `npm run build`

## Additional Resources

- [Hostinger Environment Variables Guide](./hostinger-environment-variables.md)
- [Production Runbook](./production-runbook-cookie-bite.com.md)
- [Hostinger Checklist](./hostinger-production-cookie-bite.com-checklist.md)
