# CHECKOUT_MIGRATION_PLAN.md

## Migration Plan: Checkout Architecture Redesign

### Overview

This plan migrates the checkout system from a multi-page Paymob-only flow to a single-page checkout supporting both Paymob and Cash on Delivery (COD) payments.

**Timeline**: 4 Phases  
**Estimated Duration**: 2-3 hours of implementation  
**Risk Level**: Medium (involves payment flow changes)

---

## Phase 1: Database Schema Updates

### Objective
Update database schema to support COD payment method and order status changes.

### Tasks

#### 1.1 Add COD Payment Method Support
**File**: New migration file  
**Priority**: CRITICAL

```sql
-- Migration: Add cash_on_delivery payment method
-- File: supabase/migrations/0103_add_cod_payment_method.sql

-- Drop existing payment_method check constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Add updated constraint with COD support
ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('card', 'wallet', 'cash_on_delivery', 'bank_transfer'));

-- Add comment
COMMENT ON COLUMN public.orders.payment_method IS 
'Payment method: card, wallet (Paymob), cash_on_delivery, bank_transfer';
```

#### 1.2 Add Shipping Method Column
**File**: New migration file  
**Priority**: MEDIUM

```sql
-- Migration: Add shipping_method column
-- File: supabase/migrations/0104_add_shipping_method_column.sql

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_method text;

COMMENT ON COLUMN public.orders.shipping_method IS 
'Selected shipping method: standard, express, etc.';

-- Create index for filtering by shipping method
CREATE INDEX IF NOT EXISTS orders_shipping_method_idx 
ON public.orders (shipping_method) 
WHERE shipping_method IS NOT NULL;
```

#### 1.3 Update Order Status Constraint
**File**: New migration file  
**Priority**: MEDIUM

```sql
-- Migration: Add 'confirmed' status
-- File: supabase/migrations/0105_add_confirmed_order_status.sql

-- Drop existing status check constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated constraint with 'confirmed' status
ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'));

COMMENT ON COLUMN public.orders.status IS 
'Order status: pending (awaiting payment/confirmation), processing (paid), confirmed (paid), shipped, delivered, cancelled, refunded';
```

### Validation
- [ ] Run migrations locally
- [ ] Verify constraints work
- [ ] Test inserting orders with COD payment method
- [ ] Test inserting orders with 'confirmed' status

---

## Phase 2: Backend API Updates

### Objective
Update backend APIs to handle COD payment method and single-page checkout.

### Tasks

#### 2.1 Update Checkout Intention API
**File**: `app/api/checkout/paymob/intention/route.ts`  
**Priority**: CRITICAL

**Changes**:
1. Add `payment_method` to BodySchema as required field
2. Add validation for payment_method enum
3. Add conditional logic:
   - If payment_method is "cash_on_delivery": Skip Paymob intention, create order, return success
   - If payment_method is "card" or "wallet": Keep existing Paymob flow
4. Update response to include order_id for COD orders

**Code Changes**:
```typescript
// Update BodySchema
const BodySchema = z.object({
  // ... existing fields
  payment_method: z.enum(["card", "wallet", "cash_on_delivery"]),
  // ... existing fields
});

// Add conditional logic in POST handler
if (payment_method === "cash_on_delivery") {
  // Create order with payment_method="cash_on_delivery"
  // Skip Paymob intention
  // Return order confirmation
  return Response.json({
    ok: true,
    orderId: order.id,
    orderCode: order.order_code,
    paymentMethod: "cash_on_delivery",
    redirectUrl: `/order-confirmation?order=${order.order_code}`,
  });
}

// Existing Paymob flow for card/wallet
```

#### 2.2 Update Payment Outcome Resolver
**File**: `lib/paymob/outcome.ts`  
**Priority**: MEDIUM

**Changes**:
1. Update `resolvePaymobPaymentOutcome` to return status="confirmed" for successful payments
2. Keep status="pending" for pending payments

**Code Changes**:
```typescript
export function resolvePaymobPaymentOutcome(transaction: Record<string, unknown>): {
  payment_status: "paid" | "failed" | "unpaid";
  status: "processing" | "pending" | "confirmed";  // Add "confirmed"
  outcome: "paid" | "failed" | "pending";
} {
  const pending = toBool(transaction.pending);
  const success = toBool(transaction.success);

  if (success) {
    return { payment_status: "paid", status: "confirmed", outcome: "paid" };  // Changed from "processing"
  }
  if (pending) {
    return { payment_status: "unpaid", status: "pending", outcome: "pending" };
  }
  return { payment_status: "failed", status: "pending", outcome: "failed" };
}
```

#### 2.3 Update Order Creation Functions
**File**: `lib/db/orders.ts`  
**Priority**: MEDIUM

**Changes**:
1. Ensure `insertCheckoutOrder` accepts and saves `shipping_method`
2. Ensure `insertCheckoutOrderTransactional` accepts and saves `shipping_method`
3. Update type definitions to include `shipping_method`

**Code Changes**:
```typescript
export type InsertCheckoutOrderInput = {
  // ... existing fields
  shippingMethod?: string | null;  // Add this
  // ... existing fields
};

// In insertCheckoutOrder function
if (params.shippingMethod) {
  insertRow.shipping_method = params.shippingMethod;
}
```

#### 2.4 Update Webhook Handler
**File**: `app/api/webhooks/paymob/route.ts`  
**Priority**: MEDIUM

**Changes**:
1. Ensure webhook handles "confirmed" status correctly
2. No major changes needed if outcome.ts is updated

### Validation
- [ ] Test COD order creation via API
- [ ] Test Paymob order creation via API
- [ ] Test webhook with "confirmed" status
- [ ] Verify shipping_method is saved
- [ ] Verify payment_method validation

---

## Phase 3: Frontend Single-Page Checkout

### Objective
Create single unified checkout page with all form fields and payment method selection.

### Tasks

#### 3.1 Create New Checkout Page
**File**: `app/(site)/checkout/page.tsx`  
**Priority**: CRITICAL

**Current State**: Redirects to `/cart`  
**Target State**: Full checkout form

**Components to Include**:
1. Customer Information
   - Full Name
   - Phone
   - Email (optional)

2. Shipping Address
   - Governorate
   - Area
   - Full Address
   - Delivery Notes
   - GPS Map Picker (reuse AddressMapPicker)

3. Shipping Method
   - Standard Delivery
   - Express Delivery (if available)
   - Display delivery fee for each

4. Promo Code
   - Promo code input
   - Apply button
   - Display discount amount

5. Order Summary
   - Items list
   - Subtotal
   - Discount
   - Delivery fee
   - Total

6. Payment Method
   - Radio buttons: Paymob (Card/Wallet) vs Cash on Delivery
   - Display payment icons

7. "Confirm Order" Button
   - Single button to submit entire form

**Implementation Approach**:
- Copy form logic from `checkout/details/page.tsx`
- Add payment method selection
- Add shipping method selection
- Integrate with existing `usePaymobCheckout` hook
- Create new hook or update existing to handle COD

#### 3.2 Update usePaymobCheckout Hook
**File**: `hooks/use-paymob-checkout.ts`  
**Priority**: CRITICAL

**Changes**:
1. Add `paymentMethod` parameter to `startCheckout`
2. Add conditional logic:
   - If COD: Call API with payment_method="cash_on_delivery"
   - If Paymob: Keep existing flow
3. Handle COD response (redirect to order confirmation)
4. Keep Paymob response (redirect to Paymob hosted checkout)

**Code Changes**:
```typescript
export function usePaymobCheckout() {
  // ... existing code

  const startCheckout = useCallback(async (
    checkoutDetails?: CheckoutDetails, 
    paymentMethod?: "card" | "wallet" | "cash_on_delivery"  // Add COD
  ) => {
    // ... existing validation

    const { body } = buildPaymobIntentionBody(lines, promo?.code, checkoutDetails, paymentMethod);

    // Add payment_method to body
    if (paymentMethod) {
      body.payment_method = paymentMethod;
    }

    const res = await fetch("/api/checkout/paymob/intention", {
      // ... existing fetch code
      body: JSON.stringify({
        ...body,
        idempotency_key: checkoutIdempotencyKey,
      }),
    });

    const data = await res.json();

    // Handle COD response
    if (data.paymentMethod === "cash_on_delivery") {
      window.location.href = data.redirectUrl;
      return true;
    }

    // Existing Paymob flow
    if (data.configured && data.paymentUrl) {
      window.location.href = data.paymentUrl;
      return true;
    }

    // ... existing error handling
  }, [/* existing dependencies */]);

  return { startCheckout, status, error, isLoading: status === "loading" };
}
```

#### 3.3 Update Cart Page Checkout Button
**File**: `app/(site)/cart/page.tsx`  
**Priority**: HIGH

**Changes**:
- Update checkout button href from `/checkout/details` to `/checkout`

**Code Changes**:
```typescript
// Find checkout button and update
<Link
  href="/checkout"  // Changed from "/checkout/details"
  className={buttonClassName("primary", "w-full")}
>
  Proceed to Checkout
</Link>
```

#### 3.4 Redirect Old Checkout Details Page
**File**: `app/(site)/checkout/details/page.tsx`  
**Priority**: MEDIUM

**Options**:
- **Option A**: Delete the file
- **Option B**: Add redirect to new checkout page

**Recommended**: Option B for backward compatibility

**Code Changes**:
```typescript
import { redirect } from "next/navigation";

export default function CheckoutDetailsPage() {
  redirect("/checkout");
}
```

#### 3.5 Update Thank You Page for COD
**File**: `app/(site)/checkout/thank-you/page.tsx`  
**Priority**: MEDIUM

**Changes**:
- Display different message for COD orders
- Show "Order Received - Pay on Delivery" for COD
- Show "Payment Successful" for Paymob
- Clear cart for both

**Code Changes**:
```typescript
// Add detection of COD orders
const isCod = orderLabel && /* check if order is COD */;

<ThankYouContent
  isFailed={isFailed}
  isPending={isPending}
  isCod={isCod}  // Add this prop
  orderLabel={orderLabel}
  isDemo={isDemo}
/>
```

#### 3.6 Update ThankYouContent Component
**File**: `components/checkout/thank-you-content.tsx`  
**Priority**: MEDIUM

**Changes**:
- Accept `isCod` prop
- Display appropriate message based on payment method

**Code Changes**:
```typescript
type ThankYouContentProps = {
  // ... existing props
  isCod?: boolean;  // Add this
};

export function ThankYouContent({ isCod, ...props }: ThankYouContentProps) {
  // ... existing code

  const title = isFailed 
    ? "Payment Failed" 
    : isCod 
      ? "Order Received" 
      : isPending 
        ? "Payment Pending" 
        : "Payment Successful";

  const message = isCod
    ? "Your order has been received. Please pay with cash upon delivery."
    : /* existing messages */;
}
```

### Validation
- [ ] Test single-page checkout rendering
- [ ] Test form validation for all fields
- [ ] Test payment method selection
- [ ] Test COD submission
- [ ] Test Paymob submission
- [ ] Test cart button redirects correctly
- [ ] Test old checkout details redirect
- [ ] Test thank you page for both flows

---

## Phase 4: Testing & Deployment

### Objective
Test all flows and deploy changes safely.

### Tasks

#### 4.1 Database Migration Testing
**Priority**: CRITICAL

**Steps**:
1. Run migrations on local database
2. Verify all migrations applied successfully
3. Test inserting orders with new schema
4. Test rollback procedures

**Commands**:
```bash
npm run supabase:migrate
```

#### 4.2 API Testing
**Priority**: CRITICAL

**Test Cases**:
1. COD order creation
2. Paymob order creation
3. Invalid payment method rejection
4. Idempotency for both flows
5. Stock validation for both flows
6. Promo code validation for both flows

**Tools**:
- Postman/Insomnia for API testing
- Existing test files in `__tests__`

#### 4.3 Frontend Testing
**Priority**: CRITICAL

**Test Cases**:
1. Single-page checkout loads
2. All form fields render
3. Form validation works
4. Payment method selection works
5. COD flow completes successfully
6. Paymob flow completes successfully
7. Cart clears on success
8. Thank you page displays correctly

**Tools**:
- Manual browser testing
- Existing E2E tests in `e2e/`

#### 4.4 Integration Testing
**Priority**: HIGH

**Test Cases**:
1. End-to-end COD flow: Cart → Checkout → COD → Success
2. End-to-end Paymob flow: Cart → Checkout → Paymob → Webhook → Success
3. Webhook processing for Paymob orders
4. Stock reservation for both flows
5. Stock release for failed Paymob payments

#### 4.5 Backward Compatibility Testing
**Priority**: MEDIUM

**Test Cases**:
1. Old links to `/checkout/details` redirect correctly
2. Existing API clients still work (if any)
3. Admin dashboard displays new payment methods
4. Existing orders display correctly

#### 4.6 Deployment
**Priority**: CRITICAL

**Steps**:
1. Create git commit with all changes
2. Run database migrations on production
3. Deploy frontend changes
4. Monitor error logs
5. Test live checkout flow
6. Rollback plan ready

**Rollback Plan**:
- Revert frontend code deployment
- Database migrations are not easily reversible (prepare forward-fix migration if needed)

---

## Implementation Order

### Sequential Order (Recommended)

1. **Phase 1**: Database migrations (1-2 migrations)
2. **Phase 2**: Backend API updates (4 files)
3. **Phase 3**: Frontend updates (6 files)
4. **Phase 4**: Testing & deployment

### Parallel Opportunities

- Phase 2.2, 2.3, 2.4 can be done in parallel (different files)
- Phase 3.3, 3.4, 3.5 can be done in parallel (different files)

---

## Risk Mitigation

### 1. Payment Flow Risk
**Risk**: Breaking existing Paymob integration  
**Mitigation**: 
- Keep existing Paymob flow unchanged
- Add COD as separate conditional branch
- Test Paymob flow thoroughly after changes

### 2. Database Migration Risk
**Risk**: Migration fails or corrupts data  
**Mitigation**:
- Test migrations on staging first
- Use IF NOT EXISTS clauses
- Prepare rollback SQL statements
- Backup database before migration

### 3. Frontend UX Risk
**Risk**: Single-page checkout is too complex/long  
**Mitigation**:
- Use collapsible sections
- Progress indicator
- Test on mobile devices
- Keep form fields minimal

### 4. COD Order Management Risk
**Risk**: High volume of unpaid COD orders  
**Mitigation**:
- Implement order expiration workflow (future enhancement)
- Add admin tools for COD order management
- Monitor COD order conversion rate

### 5. Stock Management Risk
**Risk**: Stock exhaustion from COD orders  
**Mitigation**:
- Ensure stock reservation works for COD
- Implement stock timeout for unpaid orders (future enhancement)
- Monitor stock levels closely

---

## Post-Migration Tasks

### 1. Monitoring
- Monitor checkout conversion rate
- Monitor payment method split (Paymob vs COD)
- Monitor error rates
- Monitor stock levels

### 2. Admin Dashboard Updates
- Update order list to show payment_method
- Update order detail page to show payment_method
- Add filters for payment method
- Add COD-specific order actions

### 3. Documentation Updates
- Update API documentation
- Update checkout flow documentation
- Update admin documentation
- Update runbooks

### 4. Customer Communication
- Announce new COD payment option
- Update checkout help documentation
- Train customer support on COD flow

---

## Success Criteria

### Functional Requirements
- [ ] Users can select Paymob or COD payment method
- [ ] COD orders are created without Paymob intention
- [ ] Paymob orders work as before
- [ ] Single-page checkout is functional
- [ ] All form validations work
- [ ] Order status transitions correctly
- [ ] Stock is reserved for both flows
- [ ] Cart clears on success for both flows

### Non-Functional Requirements
- [ ] Page load time < 3 seconds
- [ ] Form submission < 2 seconds
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Error handling graceful

### Business Requirements
- [ ] Checkout conversion rate maintained or improved
- [ ] COD payment option available
- [ ] Payment method split tracked
- [ ] Admin can manage COD orders

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Database migrations | 30 minutes |
| Phase 2 | Backend API updates | 45 minutes |
| Phase 3 | Frontend updates | 60 minutes |
| Phase 4 | Testing & deployment | 45 minutes |
| **Total** | | **3 hours** |

---

## Notes

- This plan assumes existing Paymob integration is working correctly
- COD order fulfillment (delivery, payment collection) is out of scope
- Stock timeout for unpaid COD orders is a future enhancement
- Shipping method selection is basic (standard/express) - can be expanded later
- All changes maintain backward compatibility where possible
- Idempotency is maintained for both payment flows
