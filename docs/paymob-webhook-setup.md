# Paymob Webhook Setup

## Webhook URL Configuration

Configure the following webhook URL in your Paymob dashboard:

```
https://cookie-bite.com/api/webhooks/paymob
```

## Setup Steps

1. **Login to Paymob Dashboard**
   - Go to https://accept.paymob.com/en/dashboard
   - Login with your credentials

2. **Navigate to Webhooks**
   - Go to Settings → Webhooks
   - Click "Add Webhook"

3. **Configure Webhook**
   - **URL**: `https://cookie-bite.com/api/webhooks/paymob`
   - **Type**: Transaction Processed
   - **HMAC Secret**: The same value as `PAYMOB_HMAC_SECRET` in your .env

4. **Test Webhook**
   - Use Paymob's webhook testing tool
   - Verify that your endpoint returns HTTP 200

## Integration IDs Configured

- **Card Payments**: 5765742 (MIGS-online11)
- **Mobile Wallet**: 5765741 (UIG-online_new)
- **Instapay**: 5670208 (UIG-in_store)
- **Tap on Phone**: 5670207 (MIGS-tap_on_phone)

## Webhook Handler

The webhook is handled by: `app/api/webhooks/paymob/route.ts`

It performs:
- HMAC signature verification
- Payment status updates
- Order status synchronization
- Loyalty points awarding
- Payment notifications

## Testing

After configuration, test the payment flow:
1. Add items to cart
2. Proceed to checkout
3. Select payment method (Card/Wallet)
4. Complete payment on Paymob iframe
5. Verify webhook callback is received
6. Check order status in admin panel
