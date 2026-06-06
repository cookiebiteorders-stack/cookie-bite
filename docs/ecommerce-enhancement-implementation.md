# E-Commerce Enhancement — Implementation Tracker

**Source plan:** `ecommerce-enhancement-plan.md` (enterprise shop/PDP strategy, v1.0)  
**Last updated:** 2026-06-05  
**Purpose:** Actionable backlog for Cookie Bite — what shipped, what's partial, what to build next.

---

## Executive Summary

| Phase | Plan scope | Actual status | Completion |
|-------|------------|---------------|------------|
| **Phase 1** — Quick Wins | PDP/shop CRO basics | ✅ Shipped | ~90% |
| **Phase 2** — Mid-Level | FBT, reviews, loyalty, ML, analytics | 🟡 Partial | ~55% |
| **Phase 3** — Advanced AI + Systems | Gift guide, personalization, 3D, subs, gamification | 🔴 Early | ~20% |

**Recommended focus:** Finish high-ROI Phase 2 gaps first, then Phase 3 Sprint 1 (AI gift guide + personalization layer 2).

### KPIs to track (baseline → target)

| Metric | Baseline (est.) | Target | Primary levers |
|--------|-----------------|--------|----------------|
| Shop → PDP CTR | TBD (GA4) | +15% | Quick view, better cards, filter facets |
| PDP add-to-cart rate | TBD | +20% | Post-add upsell, payment icons, urgency honesty |
| AOV | TBD | +25% | FBT bundle, drawer upsell, free-ship nudge |
| Cart abandonment | ~70% | ~50% | Drawer (done), WhatsApp/SMS reminder |
| Chat-assisted conversion | TBD | measurable funnel | Mr. Brownie gift quiz + product cards |

---

## Phase 1 — Quick Wins

### ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| PDP trust strip below CTA | ✅ | `components/shop/pdp-trust-strip.tsx` |
| Price in CTA button | ✅ | `product-cart-actions.tsx` → `addToCartWithPrice` |
| Post-add cart drawer | ✅ | `cart-provider.tsx` opens drawer on add |
| Low-stock urgency (real inventory) | ✅ | PDP `stockLeft` when ≤10 |
| Sticky mobile PDP CTA | ✅ | `pdp-sticky-bar.tsx`, `pdp-actions.tsx` |
| Product card hover 2nd image | ✅ | `product-card.tsx` |
| Add-to-cart success flash | ✅ | `product-cart-actions.tsx` (2s) |
| Shop filter chips + clear all | ✅ | `shop-filter-chips.tsx` |
| Mobile filter bottom sheet | ✅ | `shop-mobile-filter-sheet.tsx` |
| Mobile sticky filter bar | ✅ | `shop-client.tsx` |
| Product JSON-LD | ✅ | `product-pdp-page-client.tsx`, `lib/seo.ts` |
| Free delivery bar in drawer | ✅ | `free-delivery-bar.tsx` |
| WebP/AVIF via Next Image | ✅ | `next.config.ts` formats |
| URL-persisted shop filters | ✅ | `shop-client.tsx` query params |

### 🟡 Gaps (finish Phase 1 properly)

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| Payment icons below PDP CTA | P0 | 0.5d | ✅ `pdp-payment-methods.tsx` in trust strip |
| Post-add upsell in drawer | P0 | 1d | ✅ `cart-drawer-upsell.tsx` + FBT fetch + GA4 `upsell_*` |
| Review section filters (Helpful / Photos / Verified) | P1 | 1d | Extend `pdp-reviews-section.tsx` |
| Star distribution histogram | P2 | 0.5d | Above review list |

---

## Phase 2 — Mid-Level Features

### ✅ Complete

| Task | Status | Notes |
|------|--------|-------|
| FBT module (rules + co-occurrence) | ✅ | `pdp-fbt-module.tsx`, `fbt-rules.ts`, `pdp-data.ts` |
| PDP reviews from DB | ✅ | `pdp-reviews-section.tsx` |
| Review photos + helpful votes | ✅ | `0051_reviews_photos_helpful.sql`, helpful API |
| GA4 shop filter events | ✅ | `ga4.ts`, `shop-client.tsx` |
| GA4 add_to_cart (PDP/cards/FBT) | ✅ | `product-cart-actions.tsx`, FBT bundle |
| Build-a-box flow (4 steps) | ✅ | `gift-box-builder.tsx`, `/gift-box/build` |
| Box preview (CSS 3D + video) | ✅ | `box-3d-preview.tsx` |
| GA4 gift-box steps | ✅ | `gift-box-builder.tsx` |
| Seasonal theming | ✅ | `seasonal-theme-provider`, `styles/seasonal.css` |
| A/B infra (client experiments) | ✅ | `lib/experiments/`, `useExperiment` — FBT placement live |
| Loyalty (earn on purchase) | ✅ | `loyalty-dashboard.tsx`, `award-order-points.ts` |
| Heatmaps (internal) | ✅ | `/admin/analytics/heatmap` |
| Trending / cart-based recs API | ✅ | `fetch-recommendations.ts` + Python fallback |
| Wishlist (basic) | ✅ | `app/api/wishlist/`, heart on `product-card.tsx` |
| ISR / catalog caching | ✅ | `cached-catalog.ts`, shop `revalidate=120` |

### 🟡 Partial — backlog (ordered by ROI)

| Task | Priority | Impact | Est. | What's missing | Key files |
|------|----------|--------|------|----------------|-----------|
| **Smart filters + facet counts** | P0 | High | 2–3d | ✅ Category/badge/stock counts; dietary/occasion/rating still missing | `shop-filters.ts`, `shop-client.tsx` |
| **Post-purchase email sequence** | P0 | High | 1–2d | `review-request` template exists but not scheduled Day 3 post-delivery | `lib/notifications/orchestrator.ts`, `lifecycle.ts` |
| **Session recordings** | P1 | Insight | 0.5d | ✅ `enableReplay` on by default in `TrackerBootstrap.tsx` | `lib/tracking-sdk/recorder.ts` |
| **Build-a-box personalization UI** | P1 | High | 2d | State has wrap/ribbon/recipient; step 3 UI is message-only | `gift-box-builder.tsx`, `lib/gift-box-builder/types.ts` |
| **Recommendations on shop ("Best Match")** | P1 | High | 2d | ML API exists; no personalized sort on `/shop` | `shop-client.tsx`, `fetch-recommendations.ts` |
| **Wishlist 2.0 (shareable gift lists)** | P2 | Medium | 3–4d | Basic wishlist only; no public share link | New table + `/wishlist/[token]` |
| **A/B tests (CTA text, urgency)** | P2 | Data | 1d | Infra ready; only FBT placement test live | `lib/experiments/` |
| **Store response on reviews** | P2 | Trust | 1d | Admin reply field + display | migration + `pdp-reviews-section.tsx` |
| **Corporate / bulk landing** | P2 | AOV | 2d | Hidden opportunity from plan §14 | new `/corporate` page |
| **WhatsApp pre-filled CTA on PDP** | P2 | GCC CVR | 0.5d | Plan bonus §14 item 10 | `pdp-trust-strip.tsx` or sticky bar |

### ❌ Not started (Phase 2 plan items)

| Task | Priority | Est. | Notes |
|------|----------|------|-------|
| Infinite scroll + progress ("X of Y") | P2 | 2d | Current: all products rendered at once |
| List view toggle on `/shop` | P3 | 1d | Exists only in legacy `src/components/search/` |
| Masonry grid | P3 | 1–2d | Optional; current 4-col grid works |
| Quick view modal on shop cards | P2 | 2d | ✅ `product-quick-view-modal.tsx` |
| Compare products (up to 3) | P3 | 3d | No UI; Mr. Brownie mentions compare in playbook only |
| AI filter quiz ("Not sure?") | P2 | 2–3d | 3 questions → filtered product set |
| Core Web Vitals reporting | P1 | 1–2d | ESLint rules only; no runtime `web-vitals` send |
| LQIP / dominant-color placeholders | P2 | 2d | Plan §6.1 |
| Inventory reserve on cart add (15 min) | P3 | 3d | Plan §7.2 |

---

## Phase 3 — Advanced AI + Systems

### 🟡 Partial (foundation exists)

| Task | Status | Notes |
|------|--------|-------|
| AI chat assistant | 🟡 | Mr. Brownie: stream, RAG, product cards, add-to-cart — see `docs/mr-brownie-implementation.md` |
| Gift occasion engine | 🟡 | `lib/mr-brownie/gift-occasion.ts` |
| Proactive selling chips | 🟡 | `proactive-selling.ts`, PDP dwell / cart idle |
| Personalization layer 1 (locale/time) | 🟡 | Language provider, seasonal context |
| Personalization layer 3 (auth user) | 🟡 | Loyalty tier + memory in `prepare-chat.ts` |
| 2D/3D box preview | 🟡 | CSS 3D in builder — not three.js / flat-lay SVG |

### ❌ Not started

| Task | Priority | Impact | Est. | Notes |
|------|----------|--------|------|-------|
| **AI gift guide quiz flow** | P0 | High | 3–4d | ✅ 3-step quiz → 3 product cards in Mr. Brownie chat |
| **Personalization layer 2 (session)** | P1 | High | 2d | ✅ Recently viewed shelf on homepage (localStorage 30d) |
| **Personalization layer 4 (post-purchase)** | P2 | Medium | 2d | Suppress bought items; "Buy again" flag |
| **2D flat-lay SVG box preview** | P2 | High | 3–4d | Plan §3.6 — items as tiles in box outline |
| **360° / three.js on PDP** | P3 | Medium | 5d+ | Plan §3.2 |
| **Product subscriptions** | P2 | LTV | 5–7d | Monthly/surprise box — not push notifications |
| **Gamification (spin wheel, badges)** | P3 | Medium | 4–5d | Plan §11.1 |
| **Group gifting (split pay)** | P3 | Medium | 7d+ | Multi-contributor checkout |
| **AR packaging preview (WebXR)** | P4 | Low | 10d+ | Phase 3 late |
| **Live commerce** | P4 | High effort | 10d+ | Phase 3 late |
| **Dynamic homepage personalization** | P2 | High | 3d | Hero + "For You" grid per user/session |

---

## Sprint Plan — Next 4 Weeks

### Sprint 1 (Week 1) — Close Phase 1 gaps + measurement

**Goal:** Maximize PDP/cart conversion with minimal scope.

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 1.1 | Payment icons in PDP trust strip | Dev | 0.5d | ✅ Shipped |
| 1.2 | Post-add upsell block in cart drawer | Dev | 1d | ✅ Shipped |
| 1.3 | GA4 baseline dashboard check | Ops | 0.5d | ⏳ Verify `upsell_viewed`, `add_to_cart`, `filter_applied` in GA4 |
| 1.4 | Apply Mr. Brownie migrations 0053–0055 if not on prod | Ops | 0.5d | ⏳ Run `npm run supabase:ensure-schema` on prod |

**Exit criteria:** Drawer upsell live; KPI baseline captured.

---

### Sprint 2 (Week 2) — Shop intelligence

**Goal:** Reduce filter friction; improve discovery.

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 2.1 | Facet counts per filter option | Dev | 2d | ✅ `shop-filters.ts` + counts on category/badge toggles |
| 2.2 | Quick view modal on `product-card.tsx` | Dev | 2d | ✅ `product-quick-view-modal.tsx` + image click |
| 2.3 | Enable session replay (`enableReplay`) | Dev | 0.5d | ✅ `TrackerBootstrap.tsx` (opt-out via `NEXT_PUBLIC_TRACKING_ENABLE_REPLAY=0`) |

**Exit criteria:** Filter sheet shows real counts; quick view on shop grid.

---

### Sprint 3 (Week 3) — AI gift guide (Phase 3 kickoff)

**Goal:** Measurable chat-assisted conversion funnel.

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 3.1 | Gift guide quiz flow in Mr. Brownie | Dev | 3d | ✅ `gift-guide-quiz.tsx` + `gift-guide.ts` |
| 3.2 | GA4 `mr_brownie_gift_guide_complete` event | Dev | 0.5d | ✅ + funnel `gift_guide_start` / `gift_guide_complete` |
| 3.3 | "Continue where you left off" module (homepage) | Dev | 2d | ✅ `home-continue-shopping.tsx` + `recently-viewed.ts` |

**Exit criteria:** End-to-end gift guide in chat; funnel events in GA4.

---

### Sprint 4 (Week 4) — Retention + box polish

**Goal:** Post-purchase loop + builder completion.

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 4.1 | Schedule review-request email Day 3 post-delivery | Dev | 1d | ✅ migration `0056` + `dispatchReviewRequest` + cron queue |
| 4.2 | Build-a-box step 3 UI (wrap, ribbon, card swatches) | Dev | 2d | ✅ `gift-box-personalization-panel.tsx` |
| 4.3 | "Best Match" sort option on shop | Dev | 1d | ✅ `best-match-sort.ts` + shop sort option |
| 4.4 | Core Web Vitals runtime reporting | Dev | 1d | ✅ `web-vitals-reporter.tsx` → GA4 `web_vitals` |

**Exit criteria:** Review emails scheduled; builder personalization complete; perf monitored.

---

### Sprint 5 (Week 5) — Discovery + sharing

**Goal:** Lower shop friction; enable wishlist virality.

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 5.1 | WhatsApp pre-filled CTA on PDP | Dev | 0.5d | ✅ `pdp-whatsapp-cta.tsx` |
| 5.2 | AI filter quiz on shop (3 steps) | Dev | 2d | ✅ `shop-filter-quiz.tsx` + `shop-filter-quiz.ts` |
| 5.3 | Infinite scroll + "X of Y" progress | Dev | 2d | ✅ paginated grid in `shop-client.tsx` |
| 5.4 | Wishlist 2.0 shareable lists | Dev | 3d | ✅ migration `0057` + `/wishlist/share/[token]` |

**Exit criteria:** Quiz applies filters; shop paginates; share link copies to clipboard.

---

### Sprint 6 (Week 6) — Trust + homepage personalization

**Goal:** Richer social proof; session-aware homepage.

| # | Task | Owner | Est. | Status |
|---|------|-------|------|--------|
| 6.1 | Review filters (photos / verified / helpful) | Dev | 1d | ✅ `pdp-reviews-section.tsx` |
| 6.2 | Star rating histogram on PDP | Dev | 0.5d | ✅ `review-stats.ts` + API `rating_distribution` |
| 6.3 | Homepage «For You» rail | Dev | 1.5d | ✅ `home-for-you-section.tsx` + best-match re-rank |

**Exit criteria:** PDP reviews filterable; histogram visible; homepage shows personalized grid.

---

## Backlog — After Sprint 6 (prioritized)

1. **2D flat-lay SVG box preview** (P2, 3–4d)
2. **Product subscriptions** (P2, 5–7d)
3. **Gamification spin wheel** (P3, 4–5d)
4. **Group gifting split pay** (P3, 7d+)
5. **three.js / 360° PDP** (P3, 5d+)
6. **Store reply on reviews** (P2, 1d)
7. **A/B CTA + urgency tests** (P2, 1d)

---

## Cross-cutting: Ops checklist (before each sprint deploy)

- [ ] `npm run type-check` passes
- [ ] Smoke test: shop filters → PDP → add to cart → drawer → checkout
- [ ] Smoke test: gift-box build → add to cart
- [ ] Smoke test: Mr. Brownie chat → product card → add to cart
- [ ] GA4 events firing (filter, add_to_cart, mr_brownie_funnel)
- [ ] Supabase migrations applied on production
- [ ] Ask user before `npm run deploy:github`

---

## File index (quick reference)

| Area | Primary paths |
|------|---------------|
| Shop | `components/shop/shop-client.tsx`, `shop-filter-chips.tsx`, `shop-mobile-filter-sheet.tsx` |
| PDP | `components/shop/product-pdp-page-client.tsx`, `pdp-fbt-module.tsx`, `pdp-reviews-section.tsx` |
| Cart | `components/cart/cart-drawer.tsx`, `components/providers/cart-provider.tsx` |
| Gift box | `components/gift-box-builder/gift-box-builder.tsx`, `box-3d-preview.tsx` |
| AI | `components/mr-brownie/`, `lib/mr-brownie/`, `docs/mr-brownie-implementation.md` |
| Experiments | `lib/experiments/`, `hooks/use-experiment.ts` |
| Analytics | `lib/analytics/ga4.ts`, `lib/analytics/mr-brownie-funnel.ts` |
| Loyalty | `components/account/loyalty-dashboard.tsx`, `lib/loyalty/` |
| Recs ML | `lib/recommendations/fetch-recommendations.ts` |

---

## Related docs

- Full strategy: `ecommerce-enhancement-plan.md` (or user copy in Downloads)
- Mr. Brownie phases: `mr-brownie-implementation.md`
- Tracking: `TRACKING_SYSTEM.md`
- Python ML recs: `python-layer.md`
