# Paymob Webhooks Quick Setup Checklist

## ✅ Pre-Flight Check

### Environment Variables (.env)
- [ ] `PAYMOB_SECRET_KEY` is set (starts with `sk_test_` or `sk_live_`)
- [ ] `PAYMOB_PUBLIC_KEY` is set (starts with `pk_test_` or `pk_live_`)
- [ ] `PAYMOB_HMAC_SECRET` is set
- [ ] `PAYMOB_INTEGRATION_ID_CARD` is set (e.g., `5765742`)
- [ ] `PAYMOB_INTEGRATION_ID_WALLET` is set (e.g., `5765741`)
- [ ] `APP_BASE_URL` is set to production domain (e.g., `https://cookie-bite.com`)
- [ ] No `NEXT_PUBLIC_` prefix on secret keys

### Environment Matching
- [ ] Test Mode: using `sk_test_` + Test Integration ID
- [ ] Live Mode: using `sk_live_` + Live Integration ID
- [ ] NOT mixing test/live keys

## ✅ Paymob Dashboard Configuration

### Webhook URL
- [ ] Go to Paymob Dashboard → Developers → Integrations
- [ ] Select your integration
- [ ] Add webhook URL: `https://cookie-bite.com/api/webhooks/paymob`
- [ ] Save

### Integration IDs
- [ ] Card Integration ID copied to `.env`
- [ ] Wallet Integration ID copied to `.env`
- [ ] Verify IDs match the environment (test/live)

## ✅ Code Verification

### Endpoints Exist
- [ ] `POST /api/webhooks/paymob` exists (Transaction Processed)
- [ ] `GET /checkout/paymob-response` exists (Transaction Response)
- [ ] `POST /api/checkout/paymob/intention` exists (Create Intention)

### HMAC Verification
- [ ] `lib/paymob/hmac.ts` has `computePaymobTransactionHmac`
- [ ] `lib/paymob/hmac.ts` has `verifyPaymobTransactionHmac`
- [ ] Uses SHA-512
- [ ] Uses timing-safe comparison

### Order Updates
- [ ] `updateOrderPaymentByPaymobAcceptOrderId` exists in `lib/db/orders`
- [ ] Updates `payment_status` in Supabase
- [ ] Updates `paymob_transaction_id` in Supabase

## ✅ Testing

### Local Testing (ngrok)
- [ ] Install ngrok
- [ ] Run: `ngrok http 3000`
- [ ] Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
- [ ] Add webhook in Paymob: `https://abc123.ngrok.io/api/webhooks/paymob`
- [ ] Test checkout flow
- [ ] Verify webhook received in server logs

### Webhook Testing Tool
- [ ] Go to https://webhook.site
- [ ] Copy the provided URL
- [ ] Add to Paymob as webhook URL
- [ ] Test payment
- [ ] Verify callback received
- [ ] Copy HMAC and test manually

### Script Testing
- [ ] Run: `node scripts/test-paymob-webhook.mjs`
- [ ] Verify HMAC computation is correct
- [ ] Check for any errors

## ✅ Production Deployment

### URLs
- [ ] Production webhook URL: `https://cookie-bite.com/api/webhooks/paymob`
- [ ] Production response URL: `https://cookie-bite.com/checkout/paymob-response`
- [ ] Both accessible over HTTPS
- [ ] No firewall blocking Paymob IPs

### Environment
- [ ] `.env` file has production values
- [ ] No test keys in production
- [ ] `APP_BASE_URL` set to production domain
- [ ] Server restarted after env changes

## ✅ End-to-End Test

### Test Payment Flow
1. [ ] Add items to cart
2. [ ] Go to checkout
3. [ ] Fill shipping details
4. [ ] Select Card or Wallet payment
5. [ ] Click "Pay with Paymob"
6. [ ] Redirect to Paymob Unified Checkout
7. [ ] Complete payment (test card: `5123456789012346`)
8. [ ] Verify webhook received (check server logs)
9. [ ] Verify order status in Supabase (`payment_status=paid`)
10. [ ] Verify redirect to order confirmation page
11. [ ] Verify email notification sent
12. [ ] Verify WhatsApp notification sent (if enabled)

### Verify in Supabase
- [ ] Order exists in `orders` table
- [ ] `payment_status` = `paid`
- [ ] `paymob_accept_order_id` matches Paymob order ID
- [ ] `paymob_transaction_id` matches Paymob transaction ID
- [ ] `status` = `confirmed` (if payment successful)

## 🔍 Troubleshooting

### Webhook Not Received
- Check URL in Paymob Dashboard
- Check server logs for errors
- Verify firewall allows Paymob requests
- Test with webhook.site

### HMAC Mismatch
- Verify `PAYMOB_HMAC_SECRET` in `.env`
- Ensure test/live keys match
- Check field order in HMAC computation
- Run test script: `node scripts/test-paymob-webhook.mjs`

### Order Not Found
- Verify order created before Paymob callback
- Check `paymob_accept_order_id` is saved
- Search Supabase for the order

### Redirect Fails
- Verify `APP_BASE_URL` in `.env`
- Check redirection URL in intention
- Test response HMAC verification

## 📚 Documentation

- [Full Arabic Guide](./paymob-webhooks-guide-ar.md)
- [Paymob Transaction Callbacks](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/transaction-callbacks)
- [Paymob HMAC Documentation](https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac)
- [Paymob Create Intention](https://developers.paymob.com/paymob-docs/developers/intention-apis/create-intention)
