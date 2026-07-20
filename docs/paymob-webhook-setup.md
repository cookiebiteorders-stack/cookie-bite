# Paymob Webhook Setup

## Webhook URL Configuration

```
https://cookie-bite.com/api/webhooks/paymob
```

Return / redirection URL (set in Intention API by the app):

```
https://cookie-bite.com/checkout/paymob-response
```

## Credentials

| Dashboard | Env var |
|-----------|---------|
| Secret Key | `PAYMOB_SECRET_KEY` |
| Public Key | `PAYMOB_PUBLIC_KEY` |
| API Key (legacy / refunds) | `PAYMOB_API_KEY` |
| HMAC Secret | `PAYMOB_HMAC_SECRET` |
| Card integration | `PAYMOB_INTEGRATION_ID_CARD` |
| Wallet integration | `PAYMOB_INTEGRATION_ID_WALLET` |

## Flow

1. Checkout → `POST /api/checkout/paymob/intention`
2. App creates DB order, then Paymob Intention (`POST /v1/intention/`)
3. Customer redirects to Unified Checkout
4. Paymob POSTs Transaction Processed → `/api/webhooks/paymob` (HMAC verified)
5. Customer returns to `/checkout/paymob-response`

## Integration IDs (reference)

- Card: 5765742
- Wallet: 5765741
- InstaPay / Tap on Phone: configured in env but web checkout treats InstaPay/Fawry/COD as offline

## Testing

1. Cart → Checkout → Card/Wallet
2. Pay on Paymob hosted page
3. Confirm webhook HTTP 200 and `payment_status=paid` in Supabase
