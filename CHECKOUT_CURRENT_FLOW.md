# CHECKOUT_CURRENT_FLOW.md

## Current Checkout Flow Analysis

### Frontend Flow

```
Cart (/cart)
  ↓
Checkout Details (/checkout/details)
  ↓
Paymob Intention API (/api/checkout/paymob/intention)
  ↓
Paymob Hosted Checkout (External)
  ↓
Paymob Response (/checkout/paymob-response)
  ↓
Thank You (/checkout/thank-you)
```

### Pages Involved

1. **Cart Page** (`app/(site)/cart/page.tsx`)
   - Displays cart items
   - Promo code field
   - Order summary
   - "Checkout" button redirects to `/checkout/details`

2. **Checkout Details Page** (`app/(site)/checkout/details/page.tsx`)
   - Collects customer information (name, phone)
   - Collects shipping address (address, area, GPS coordinates)
   - Delivery date selection
   - Calls `usePaymobCheckout` hook
   - Submits to `/api/checkout/paymob/intention`

3. **Paymob Response Page** (`app/(site)/checkout/paymob-response/page.tsx`)
   - Handles redirect from Paymob
   - Optional HMAC verification
   - Redirects to `/checkout/thank-you` or `/order-confirmation`

4. **Thank You Page** (`app/(site)/checkout/thank-you/page.tsx`)
   - Displays payment status
   - Clears cart on success
   - Tracks purchase events

5. **Checkout Page** (`app/(site)/checkout/page.tsx`)
   - Currently redirects to `/cart` (legacy redirect)

### API Endpoints

1. **POST /api/checkout/paymob/intention** (`app/api/checkout/paymob/intention/route.ts`)
   - Validates CSRF token (production only)
   - Resolves line items from database
   - Validates stock
   - Validates promo code
   - Calculates shipping and totals
   - Creates order in database (status=pending, payment_status=unpaid)
   - Creates Paymob intention
   - Returns Paymob hosted checkout URL

2. **POST /api/webhooks/paymob** (`app/api/webhooks/paymob/route.ts`)
   - Verifies HMAC signature
   - Validates transaction fields
   - Updates order payment status
   - Records payment in ledger
   - Schedules notifications
   - Awards loyalty points
   - Releases stock on failed payment

### Database Operations

#### Tables Involved

- **orders**
  - Main order record
  - Columns: id, order_number, order_code, user_id, status, payment_status, payment_method, subtotal_egp, delivery_fee_egp, total_egp, shipping_address, paymob_accept_order_id, checkout_idempotency_key, etc.

- **order_items**
  - Order line items
  - Columns: id, order_id, product_id, product_name, unit_price_egp, quantity, etc.

- **products**
  - Product stock validation
  - Price validation

- **promo_codes**
  - Promo code validation
  - Discount calculation

- **checkout_idempotency**
  - Prevents duplicate orders (via checkout_idempotency_key on orders table)

#### RPC Functions

- **release_stock_for_order** (migration 0097)
  - Releases stock for failed/cancelled orders

### Key Components

1. **CartProvider** (`components/providers/cart-provider.tsx`)
   - Manages cart state
   - Generates checkout idempotency key
   - Handles promo codes

2. **usePaymobCheckout** (`hooks/use-paymob-checkout.ts`)
   - Builds intention payload
   - Calls Paymob intention API
   - Handles redirect

3. **resolveCheckoutLineItems** (`lib/checkout/resolve-line-items.ts`)
   - Validates products
   - Checks stock
   - Calculates prices
   - Validates variants and addons

### Payment Flow

#### Paymob Payment
```
User submits checkout details
  ↓
POST /api/checkout/paymob/intention
  ↓
Server validation:
  - Session validation
  - Stock validation
  - Price validation
  - Promo validation
  - Shipping calculation
  ↓
Create order (status=pending, payment_status=unpaid)
  ↓
Create Paymob intention
  ↓
Return Paymob hosted checkout URL
  ↓
Redirect to Paymob
  ↓
User completes payment on Paymob
  ↓
Paymob webhook callback
  ↓
Update order (payment_status=paid, status=processing)
  ↓
Record payment in ledger
  ↓
Schedule notifications
  ↓
Award loyalty points
```

### Current Limitations

1. **No Cash on Delivery Option**
   - Only Paymob payment is supported
   - No COD payment method exists

2. **Multi-Page Checkout**
   - Cart → Checkout Details → Paymob
   - Not a single unified checkout page

3. **Order Created Before Payment**
   - Order is created with payment_status=unpaid
   - Paymob intention is created after order
   - Webhook updates payment status

4. **Single Payment Method**
   - payment_method is hardcoded to "card" or "wallet"
   - No support for COD

5. **Shipping Information Collected Twice**
   - Collected in checkout details page
   - Collected again by Paymob on hosted checkout
   - Redundant user input

### Security Features

1. **CSRF Protection** (production only)
2. **HMAC Verification** on webhook
3. **Idempotency Key** to prevent duplicate orders
4. **Stock Validation** before order creation
5. **Price Validation** from database
6. **Promo Code Validation** server-side

### Database Schema

#### Orders Table Structure
```sql
create table public.orders (
  id uuid primary key,
  order_number serial unique,
  order_code text,
  user_id uuid references public.users(id),
  status text default 'pending',
  payment_status text default 'unpaid',
  payment_method text,
  subtotal_egp numeric,
  delivery_fee_egp numeric,
  total_egp numeric,
  shipping_address jsonb,
  paymob_accept_order_id bigint,
  checkout_idempotency_key text,
  -- ... additional columns
);
```

#### Payment Methods Supported
- `card` - Paymob card payment
- `wallet` - Paymob wallet payment
- **NO COD support currently**

### Sequence Diagram

```
User → Cart Page: View cart
User → Cart Page: Click checkout
Cart Page → Checkout Details: Redirect
User → Checkout Details: Enter details
User → Checkout Details: Submit
Checkout Details → API: POST /api/checkout/paymob/intention
API → Database: Validate products
API → Database: Validate stock
API → Database: Calculate totals
API → Database: Create order
API → Paymob: Create intention
Paymob → API: Return payment URL
API → Checkout Details: Return URL
Checkout Details → User: Redirect to Paymob
User → Paymob: Complete payment
Paymob → Webhook: POST /api/webhooks/paymob
Webhook → Database: Update order
Webhook → Database: Record payment
Webhook → User: Schedule notifications
User → Paymob Response: Redirect back
Paymob Response → Thank You: Redirect
Thank You → User: Show confirmation
```

### API Sequence

1. **POST /api/checkout/paymob/intention**
   - Request: items, shipping (optional), promo_code, idempotency_key
   - Response: { ok: true, paymentUrl: string }

2. **POST /api/webhooks/paymob**
   - Request: { obj: transaction, hmac: string }
   - Response: { ok: true, matched: boolean, outcome: string }

### Database Sequence

1. **Order Creation**
   - Insert into `orders`
   - Insert into `order_items`
   - Validate stock constraints
   - Apply idempotency key

2. **Payment Update**
   - Update `orders.payment_status`
   - Update `orders.status`
   - Insert into `payments` (ledger)
   - Update `promo_code_uses` if applicable

3. **Stock Management**
   - Stock reserved on order creation
   - Stock released on payment failure (via RPC)

### Middleware

- **CSRF Protection** via `requireCsrfProtection` (production only)
- **Session Validation** via Supabase auth
- **Rate Limiting** (not currently implemented)

### Current Issues

1. **No COD Flow**
   - Cannot create orders without Paymob
   - No offline payment support

2. **Redundant Data Collection**
   - Shipping info collected on both site and Paymob

3. **Split Checkout Experience**
   - Not a unified single-page checkout

4. **Limited Payment Methods**
   - Only Paymob card/wallet supported

5. **No Payment Method Selection**
   - User cannot choose between Paymob and COD
