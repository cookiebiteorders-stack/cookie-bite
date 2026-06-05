# E-Commerce Enhancement — Implementation Tracker

Source plan: `ecommerce-enhancement-plan.md` (enterprise shop/PDP strategy).

## Phase 1 — Quick Wins (complete)

| Task | Status | Notes |
|------|--------|-------|
| PDP trust strip below CTA | ✅ | `pdp-trust-strip.tsx` |
| Price in CTA button | ✅ | Already: `addToCartWithPrice` |
| Post-add cart drawer | ✅ | `cart-provider` opens drawer |
| Low-stock urgency (real inventory) | ✅ | PDP `stockLeft` when ≤10 |
| Sticky mobile PDP CTA | ✅ | `pdp-sticky-bar.tsx` |
| Product card hover 2nd image | ✅ | `product-card.tsx` |
| Add-to-cart success flash | ✅ | `product-cart-actions.tsx` |
| Shop filter chips + clear all | ✅ | `shop-filter-chips.tsx` |
| Mobile filter bottom sheet | ✅ | `shop-mobile-filter-sheet.tsx` |
| Mobile sticky filter bar | ✅ | `shop-client.tsx` |
| Product JSON-LD | ✅ | Existing on PDP |
| Free delivery bar in drawer | ✅ | `FreeDeliveryBar` |

## Phase 2 — Complete

| Task | Status | Notes |
|------|--------|-------|
| FBT module (manual rules + order co-occurrence) | ✅ | `pdp-fbt-module.tsx`, `fbt-rules.ts`, `pdp-data.ts` |
| PDP reviews display (approved from DB) | ✅ | `pdp-reviews-section.tsx` |
| GA4 shop filter events | ✅ | `ga4.ts`, `shop-client.tsx` |
| GA4 add_to_cart on PDP/cards | ✅ | `product-cart-actions.tsx`, FBT bundle |
| Build-a-box flow polish | ✅ | Free delivery bar, trust line, GA4 steps |
| Review photos + helpful votes | ✅ | `0051_reviews_photos_helpful.sql`, helpful API |
| A/B testing infrastructure | ✅ | `lib/experiments/`, `useExperiment`, FBT placement test |
| Seasonal theming | ✅ | `seasonal-theme-provider`, `styles/seasonal.css` |

## Phase 3 — Later

- AI chat gift guide (Mr. Brownie expansion)
- 3D box preview
- Subscriptions, gamification
