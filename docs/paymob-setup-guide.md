# Paymob Integration Setup Guide

## Overview

Cookie Bite has a complete Paymob integration using the modern **Intention API** with Unified Checkout. The implementation includes:

- ✅ Intention API (`POST /v1/intention/`)
- ✅ HMAC SHA-512 webhook verification
- ✅ Database schema for Paymob order tracking
- ✅ Support for Card and Wallet payments
- ✅ Webhook handling for payment status updates
- ✅ Refund functionality

## Current Status

### Code Implementation: ✅ COMPLETE
- API routes: `/api/checkout/paymob/intention` and `/api/webhooks/paymob`
- Core libraries: `lib/paymob/intention.ts`, `lib/paymob/hmac.ts`, `lib/paymob/config.ts`
- Database schema: Multiple migrations adding `paymob_accept_order_id` and `paymob_transaction_id`

### Configuration: ⚠️ REQUIRES SETUP
You need to configure your Paymob credentials and environment variables.

---

## Step 1: Paymob Account Setup

### 1.1 Create/Access Paymob Account
1. Go to [Paymob Egypt Dashboard](https://eg.dashboard.paymob.com/login/)
2. Sign up or log in with your credentials
3. Navigate to **Settings → Developers → API Keys**

### 1.2 Get Your Credentials
From the Paymob dashboard, collect these values:

| Credential | Purpose | Format |
|------------|---------|--------|
| **Secret Key** | Server-side authentication | `sk_test_*` (sandbox) or `sk_live_*` (production) |
| **Public Key** | Frontend checkout | `pk_test_*` (sandbox) or `pk_live_*` (production) |
| **HMAC Secret** | Webhook verification | Base64 encoded string |
| **API Key** | Transaction inquiry | `YOUR_API_KEY` |

### 1.3 Configure Payment Integrations
1. Go to **Accept → Integrations** in Paymob dashboard
2. Enable the payment methods you want:
   - **Card Payments** (Online Card)
   - **Mobile Wallets** (Vodafone Cash, Etisalat, Orange, etc.)
3. Note the **Integration ID** for each payment method

### 1.4 Configure Webhook
1. Go to **Accept → Webhooks** in Paymob dashboard
2. Add a new webhook:
   - **URL**: `https://your-domain.com/api/webhooks/paymob`
   - **Events**: "Transaction Processed"
3. For testing, you can use [hooks.paymob.com](https://hooks.paymob.com) for sandbox testing

### 1.5 Configure Redirect URL
1. In your integration settings, set the redirect URL to:
   - `https://your-domain.com/checkout/paymob-response`
2. This is where users return after payment

---

## Step 2: Environment Configuration

### 2.1 Add Paymob Variables to `.env`

Add these variables to your `.env` file (never commit `.env` with real values):

```bash
# Paymob Payment Gateway
PAYMOB_SECRET_KEY=sk_test_your_secret_key_here
PAYMOB_PUBLIC_KEY=pk_test_your_public_key_here
PAYMOB_HMAC_SECRET=your_hmac_secret_here
PAYMOB_API_KEY=your_api_key_here
PAYMOB_INTEGRATION_ID_CARD=1234567
PAYMOB_INTEGRATION_ID_WALLET=7654321
# Optional - defaults to https://accept.paymob.com
PAYMOB_API_URL=https://accept.paymob.com
```

### 2.2 Key vs Mode Matching
⚠️ **Important**: Your Secret Key mode must match your Integration IDs mode:
- **Test mode**: Use `sk_test_*` keys with test Integration IDs
- **Live mode**: Use `sk_live_*` keys with live Integration IDs
- Mismatched modes will cause 404 errors when creating intentions

### 2.3 App Base URL
Ensure your `APP_BASE_URL` is set correctly:
```bash
# Local development
APP_BASE_URL=http://localhost:3000

# Production
APP_BASE_URL=https://cookie-bite.com
```

---

## Step 3: Database Setup

### 3.1 Run Supabase Migrations
The Paymob schema is already in migrations. Run:

```bash
npm run supabase:migrate
```

This will apply:
- `0002_orders_paymob.sql` - Basic Paymob columns
- `0008_schema_alignment_and_security.sql` - Additional Paymob fields
- `0077_checkout_order_schema_fix.sql` - Latest schema updates

### 3.2 Verify Schema
Your `orders` table should have:
- `paymob_accept_order_id` (bigint) - Paymob order ID
- `paymob_transaction_id` (text) - Paymob transaction ID
- Proper indexes for efficient lookups

---

## Step 4: Webhook Configuration

### 4.1 Verify Webhook Endpoint
Your webhook is at: `/api/webhooks/paymob`

The implementation:
- ✅ Verifies HMAC SHA-512 signatures
- ✅ Updates order payment status
- ✅ Handles success/failed outcomes
- ✅ Triggers notifications and loyalty points

### 4.2 Test Webhook (Sandbox)
For testing, use [hooks.paymob.com](https://hooks.paymob.com):
1. Create a temporary webhook URL
2. Point Paymob to the temporary URL
3. Forward requests to your local dev server
4. Test payment flows

### 4.3 Production Webhook
In production:
1. Use HTTPS (required by Paymob)
2. Ensure your domain is publicly accessible
3. Configure firewall/proxy to allow POST requests to `/api/webhooks/paymob`

---

## Step 5: Testing the Integration

### 5.1 Configuration Check
Run the Paymob configuration check:

```bash
npm run paymob:test
```

This will verify:
- ✅ All required environment variables are set
- ✅ Integration IDs are valid numbers
- ✅ API URLs are accessible
- ✅ Webhook URL is configured

### 5.2 Test Intention Creation
Test creating a payment intention:

```bash
# Use the test script
node scripts/test-paymob-integration.mjs
```

This will:
- Create a test intention
- Return a payment URL
- Show the checkout flow

### 5.3 Test Payment Flow
1. Add items to cart
2. Go to checkout
3. Select "Card" or "Wallet" payment
4. Click "Pay with Paymob"
5. Complete payment on Paymob's hosted page
6. Verify redirect to `/checkout/paymob-response`
7. Check database for order status update

### 5.4 Test Webhook Processing
1. Make a test payment
2. Check server logs for webhook callback
3. Verify HMAC verification passes
4. Confirm order status updates to `paid`
5. Check notifications are sent

---

## Step 6: Security Best Practices

### 6.1 Environment Variables
- ✅ Never commit `.env` with real credentials
- ✅ Use different keys for test and production
- ✅ Rotate keys periodically
- ✅ Store secrets securely in production

### 6.2 Webhook Security
- ✅ Always verify HMAC signatures
- ✅ Never trust client-side payment status
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on webhook endpoint

### 6.3 API Security
- ✅ Secret keys stay server-side only
- ✅ Public keys are safe for frontend
- ✅ Use CSRF protection on payment initiation
- ✅ Implement idempotency for payment retries

---

## Step 7: Production Deployment

### 7.1 Environment Variables on Hostinger
Add Paymob variables to your Hostinger environment:

```bash
PAYMOB_SECRET_KEY=sk_live_your_live_secret_key
PAYMOB_PUBLIC_KEY=pk_live_your_live_public_key
PAYMOB_HMAC_SECRET=your_live_hmac_secret
PAYMOB_API_KEY=your_live_api_key
PAYMOB_INTEGRATION_ID_CARD=live_card_integration_id
PAYMOB_INTEGRATION_ID_WALLET=live_wallet_integration_id
APP_BASE_URL=https://cookie-bite.com
```

### 7.2 Domain Configuration
1. Ensure HTTPS is enabled on your domain
2. Configure DNS for your domain
3. Set up SSL certificate (automatic on Hostinger)
4. Update Paymob webhook URL to production domain

### 7.3 Testing in Production
1. Make a small test transaction (e.g., 1 EGP)
2. Verify payment processes correctly
3. Check webhook callbacks work
4. Confirm order status updates
5. Test refund flow if needed

---

## Troubleshooting

### Common Issues

#### 1. "Paymob authentication failed (401)"
**Cause**: Invalid Secret Key or mode mismatch
**Solution**: 
- Verify `PAYMOB_SECRET_KEY` is correct
- Ensure key mode matches Integration IDs (test vs live)

#### 2. "Integration ID not found (404)"
**Cause**: Invalid Integration ID or mode mismatch
**Solution**:
- Check `PAYMOB_INTEGRATION_ID_CARD` and `PAYMOB_INTEGRATION_ID_WALLET`
- Ensure IDs match your Secret Key mode (test vs live)

#### 3. "Invalid HMAC (401)"
**Cause**: Webhook signature verification failed
**Solution**:
- Verify `PAYMOB_HMAC_SECRET` is correct
- Check webhook is receiving correct format
- Ensure field order matches Paymob docs

#### 4. Webhook not triggering
**Cause**: Webhook URL not accessible or incorrect
**Solution**:
- Test webhook URL with curl/Postman
- Ensure HTTPS in production
- Check firewall/proxy settings
- Verify Paymob dashboard configuration

#### 5. Payment status not updating
**Cause**: Order not found or webhook processing failed
**Solution**:
- Check server logs for webhook errors
- Verify `paymob_accept_order_id` is saved correctly
- Ensure database migrations are applied

---

## Advanced Features

### Refund Processing
The codebase includes refund functionality:

```typescript
import { paymobRefundTransaction } from "@/lib/paymob/accept";

// Refund a transaction
await paymobRefundTransaction(authToken, transactionId, amountCents);
```

### Saved Cards
For saved card payments, you need:
- `PAYMOB_INTEGRATION_ID_MOTO` (Merchant On-Time Order)
- Card token creation flow
- Backend-only charge flow

### Apple Pay
Apple Pay requires additional configuration:
- Apple Pay merchant ID
- Payment processing certificate
- Paymob Apple Pay integration setup

---

## Support and Resources

### Official Documentation
- [Paymob Developers Docs](https://developers.paymob.com/paymob-docs)
- [Intention API Guide](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention)
- [Webhook HMAC Guide](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-hmac/hmac-transaction-callback)

### Internal Resources
- Paymob Integration Checklist: `.cursor/plans/paymob_integration_checklist_1d5a0457.plan.md`
- Paymob AI Skill: `skills/paymob-integration/`
- Setup Script: `scripts/setup-paymob-env.mjs`

### Test Scripts
- `npm run paymob:test` - Full integration test
- `node scripts/test-paymob-integration.mjs` - Intention creation test
- `node scripts/test-paymob-webhook.mjs` - Webhook test

---

## Integration Flow Diagram

```
User → Checkout Page → POST /api/checkout/paymob/intention
                              ↓
                        Create Order in DB
                              ↓
                        Create Paymob Intention
                              ↓
                        Return Payment URL
                              ↓
User → Paymob Hosted Checkout → Complete Payment
                              ↓
                        Paymob Webhook → POST /api/webhooks/paymob
                              ↓
                        Verify HMAC
                              ↓
                        Update Order Status
                              ↓
                        Trigger Notifications
                              ↓
User → Redirect to /checkout/paymob-response → Thank You Page
```

---

## Next Steps

1. **Set up Paymob account** and get credentials
2. **Configure environment variables** in `.env`
3. **Run Supabase migrations** to ensure schema is up to date
4. **Test with sandbox** using test credentials
5. **Configure production webhook** with your domain
6. **Deploy to production** with live credentials
7. **Monitor transactions** via Paymob dashboard

---

## Summary

Your Cookie Bite project has a **complete, production-ready Paymob integration**. The main remaining steps are:

1. ✅ **Get Paymob credentials** from the dashboard
2. ✅ **Configure environment variables** 
3. ✅ **Test the integration** in sandbox mode
4. ✅ **Deploy to production** with live credentials

The code implementation follows Paymob best practices and includes proper security, error handling, and webhook verification.