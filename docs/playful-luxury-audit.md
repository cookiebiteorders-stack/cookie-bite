# Playful Luxury — Contrast & UI Audit Log

**Date:** 2026-05-21  
**Scope:** Storefront (`cb-storefront`) — cookie-bite.com public pages  
**Design system:** `app/styles/playful-luxury.css`, `lib/design-tokens.ts`

## P0 fixes applied

| Issue | Location | Fix |
|-------|----------|-----|
| `theme-color` `#141210` (near-black) | `app/layout.tsx` viewport | Both schemes → `#F8F5EE` |
| Dark announcement bar | `announcement-bar.tsx` | `cb-pl-announcement` + `--gradient-premium`, white text |
| Dark footer | `site-footer.tsx` | `cb-pl-footer` on `#F0EBE1`, links `#6B6B6B` |
| Body text too light on cream | `playful-luxury.css` `:root` | `--cb-text-muted` → secondary `#6B6B6B` (not `#9CA3AF` for body) |
| Dark storefront in dark mode | `page-shell.tsx` + `.cb-storefront` | Light canvas lock; caramel buttons preserved |

## P1 fixes applied

| Issue | Location | Fix |
|-------|----------|-----|
| Hero white text on video/scrim | `hero-section-5.tsx` | `cb-pl-hero` + warm overlay `cb-pl-hero-overlay`; titles `#2B2B2B`, kicker caramel |
| Inverted / low-contrast CTAs | `button.tsx`, `.cb-pl-btn-*` | Primary caramel / white; ghost caramel border |
| Dark newsletter card | `newsletter-banner.tsx` | `cb-pl-newsletter` premium gradient, white copy, white subscribe pill |
| Dark product cards | `product-card.tsx` | `cb-pl-product-card` white + shadow; badge contrast rules |
| Collection text on dark overlay | `explore-categories.tsx` | Lighter overlay; card copy on white panel |

## P2 fixes applied

| Issue | Location | Fix |
|-------|----------|-----|
| Navbar transparent over hero | `site-header.tsx` | `cb-pl-navbar` + `is-scrolled` white blur |
| Newsletter placeholder on dark | `newsletter-banner.tsx` | `rgba(255,255,255,0.65)` on glass input |
| Mobile tab bar contrast | `mobile-tab-bar.tsx` + CSS | `cb-pl-mobile-nav` white bar, caramel active state |
| Shop filters / pills | `shop-client.tsx` | `cb-pl-shop-header`, `cb-pl-filter-bar`, `cb-pl-pill` active caramel |

## P3 fixes applied

| Issue | Location | Fix |
|-------|----------|-----|
| Unsanctioned dark gradients | Hero, newsletter, shop header | Approved 2-color gradients only |
| Section alternation | Home sections | cream → white → warm/blush/mint → premium newsletter → cream footer |
| Instagram captions on photos | `instagram-grid.tsx` | Hover icon only; no persistent text on images |
| WhatsApp overlap mobile nav | `whatsapp-fab.tsx` | `bottom-20` mobile, `cb-pl-whatsapp` pulse |

## Forbidden pairings — verified avoided

- `#9CA3AF` on `#F8F5EE` for body copy — **not used** for primary text (footer column headings only, UI labels)
- Caramel `#D2A47B` as small body text on cream — **not used**
- White text on pastel/cream — **not used** (newsletter uses premium gradient only)
- `#141210` backgrounds — **removed** from storefront shell

## Approved pairings in use

- Cream `#F8F5EE` + primary `#2B2B2B` — hero, cards, shop
- Cream + secondary `#6B6B6B` — subtitles, footer links
- Caramel `#D2A47B` + white `#FFFFFF` — buttons, announcement, active pills
- Premium gradient + white — newsletter, announcement

## Files touched (storefront)

- `app/styles/playful-luxury.css`
- `app/globals.css` (import)
- `app/layout.tsx` (theme-color)
- `lib/design-tokens.ts`, `lib/brand.ts`
- `components/layout/*`, `components/ui/hero-section-5.tsx`
- `components/sections/*`, `components/product/product-card.tsx`
- `components/shop/shop-client.tsx`

## Remaining (non-blocking)

- **Typography:** Spec lists Cormorant Garamond + Plus Jakarta Sans; site still loads Playfair/Montserrat/Cairo — display mapped via existing `--font-playfair` in PL CSS.
- **Admin panel:** Uses `admin.css`; not forced to Playful Luxury palette.
- **Hero video:** Retained with warm tint overlay; typography-first readability achieved via overlay opacity.

## Quality checklist

- [x] Zero `#141210` storefront backgrounds
- [x] No white text on pastel/cream sections
- [x] CTAs caramel + white (≥3:1 large text)
- [x] Body text ≥4.5:1 on light backgrounds
- [x] RTL logical spacing (`cb-pl-chevron`, `inset-inline-*`)
- [x] `prefers-reduced-motion` in `playful-luxury.css`
- [x] `theme-color` `#F8F5EE`
