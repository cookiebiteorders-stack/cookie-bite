# Cookie Bite - Complete Website Blueprint

**Production Domain:** https://cookie-bite.com  
**Last Updated:** July 2026  
**Version:** 0.1.0

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [All Pages & Routes](#all-pages--routes)
5. [All API Routes](#all-api-routes)
6. [All Components](#all-components)
7. [Database Schema](#database-schema)
8. [Environment Variables](#environment-variables)
9. [Features & Functionality](#features--functionality)
10. [Integrations](#integrations)
11. [Security](#security)
12. [Scripts & Tools](#scripts--tools)
13. [Testing](#testing)
14. [Deployment](#deployment)

---

## Project Overview

Cookie Bite is a comprehensive e-commerce platform for cookies and gift boxes with an advanced admin dashboard. The platform supports:

- **Multi-language:** Arabic/English with RTL support
- **Payment Integration:** Paymob (card payments + COD)
- **AI Chatbot:** Mr. Brownie (storefront) + Mrs. Cookie (admin)
- **Gift Box Builder:** Custom gift box creation with sharing
- **Loyalty System:** Points, referrals, rewards
- **B2B Features:** Corporate gifting, bulk orders
- **Advanced Admin:** Full dashboard with analytics, CRM, financial reports
- **Email Automation:** Resend integration with automated campaigns
- **WhatsApp Notifications:** Order confirmations and updates

---

## Tech Stack

### Core Framework
- **Next.js 16** - App Router with React 19
- **TypeScript** - Strict mode enabled
- **Node.js** - Version 20+ required

### Frontend
- **React 19** - UI framework
- **Tailwind CSS v4** - Styling
- **Motion/Framer Motion** - Animations
- **Lucide React** - Icons
- **Zustand** - State management (admin dashboards)
- **React Hook Form** - Form handling
- **Zod** - Validation
- **TanStack Table** - Admin data tables
- **Recharts** - Charts and analytics

### Backend & Database
- **Supabase** - PostgreSQL database with RLS
- **Supabase Auth** - Authentication (migrated from Clerk)
- **BullMQ** - Background job queues
- **Redis** - Rate limiting and queue storage (optional)

### Integrations
- **Paymob** - Payment processing
- **Cloudinary** - Image/video storage
- **Sanity** - CMS for blog/content
- **Resend** - Email service
- **Google Gemini** - AI chatbot
- **WhatsApp Cloud API** - Notifications
- **Google Analytics 4** - Analytics

### Development Tools
- **ESLint** - Linting
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **TypeScript** - Type checking

---

## Project Structure

```
cookie-bite/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # Admin dashboard routes
│   │   └── admin/                # Admin pages
│   ├── (auth)/                   # Authentication routes
│   │   ├── auth/                 # Supabase auth callbacks
│   │   ├── sign-in/              # Login page
│   │   ├── sign-up/              # Registration
│   │   ├── forgot-password/      # Password recovery
│   │   └── reset-password/       # Password reset
│   ├── (site)/                   # Public storefront
│   │   ├── account/              # User account pages
│   │   ├── blog/                 # Blog pages
│   │   ├── cart/                 # Shopping cart
│   │   ├── checkout/             # Checkout flow
│   │   ├── gift-box/             # Gift box builder
│   │   ├── help/                 # Help/FAQ pages
│   │   ├── shop/                 # Product listing
│   │   └── [various pages]       # Other public pages
│   ├── 403/                      # Forbidden page
│   ├── api/                      # API routes
│   ├── layout.tsx                # Root layout
│   ├── error.tsx                 # Error boundary
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── account/                  # Account-related components
│   ├── admin/                    # Admin dashboard components
│   ├── ai-chat/                  # AI chatbot components
│   ├── analytics/                # Analytics tracking
│   ├── announcements/            # Announcement banners
│   ├── auth/                     # Authentication components
│   ├── brand/                    # Brand assets
│   ├── cart/                     # Cart components
│   ├── checkout/                 # Checkout components
│   ├── contact/                  # Contact form
│   ├── debug/                    # Debug tools
│   ├── gift-box/                 # Gift box components
│   ├── gift-box-builder/         # Gift box builder
│   ├── invoices/                 # Invoice components
│   ├── layout/                   # Layout components
│   ├── mr-brownie/               # AI chatbot widget
│   ├── mystery-box/              # Mystery box components
│   ├── pages/                    # Page-specific components
│   ├── print/                    # Print components
│   ├── product/                  # Product components
│   ├── providers/                # Context providers
│   ├── pwa/                      # PWA components
│   ├── sections/                 # Page sections
│   ├── seo/                      # SEO components
│   ├── shop/                     # Shop components
│   ├── tracking/                 # Order tracking
│   ├── ui/                       # UI components
│   └── wishlist/                 # Wishlist components
├── lib/                          # Shared utilities
│   ├── account/                  # Account utilities
│   ├── addons/                   # Add-on system
│   ├── admin/                    # Admin utilities
│   ├── ai/                       # AI utilities
│   ├── ai-agent/                 # AI agent logic
│   ├── ai-chat/                  # AI chat utilities
│   ├── analytics/                # Analytics utilities
│   ├── announcements/            # Announcement system
│   ├── auth/                     # Authentication utilities
│   ├── background/               # Background workers
│   ├── build/                    # Build utilities
│   ├── cart/                     # Cart logic
│   ├── chat/                     # Chat utilities
│   ├── checkout/                 # Checkout logic
│   ├── client/                   # Client utilities
│   ├── cloudinary/               # Cloudinary integration
│   ├── cms/                      # CMS utilities
│   ├── config/                   # Configuration
│   ├── content/                  # Content utilities
│   ├── csv/                      # CSV utilities
│   ├── data.ts                   # Static data
│   ├── db/                       # Database utilities
│   ├── delivery/                 # Delivery scheduling
│   ├── design-tokens.ts          # Design tokens
│   ├── domain/                   # Domain utilities
│   ├── email/                    # Email utilities
│   ├── experiments/              # A/B testing
│   ├── financial/                # Financial utilities
│   ├── gift-box/                 # Gift box logic
│   ├── gift-box-builder/         # Gift box builder logic
│   ├── hooks/                    # Custom hooks
│   ├── i18n/                     # Internationalization
│   ├── instagram/                # Instagram integration
│   ├── invoices/                 # Invoice generation
│   ├── legal/                    # Legal utilities
│   ├── logger.ts                 # Logging
│   ├── loyalty/                  # Loyalty system
│   ├── map/                      # Map utilities
│   ├── mr-brownie/               # AI chatbot logic
│   ├── mystery-box/              # Mystery box logic
│   ├── notification-library/     # Notification templates
│   ├── notifications/            # Notification system
│   ├── occasion-templates/       # Occasion templates
│   ├── offers/                   # Offers system
│   ├── orders/                   # Order utilities
│   ├── payments/                 # Payment utilities
│   ├── paymob/                   # Paymob integration
│   ├── preferences/              # User preferences
│   ├── print/                    # Print utilities
│   ├── products/                 # Product utilities
│   ├── promo/                    # Promo codes
│   ├── pwa/                      # PWA utilities
│   ├── python-api.ts             # Python API integration
│   ├── recommendations/          # Product recommendations
│   ├── sanity/                   # Sanity CMS
│   ├── seasonal/                 # Seasonal features
│   ├── security/                 # Security utilities
│   ├── seo/                      # SEO utilities
│   ├── server-only.ts            # Server-only marker
│   ├── shipping/                 # Shipping logic
│   ├── storefront/               # Storefront utilities
│   ├── supabase/                 # Supabase utilities
│   ├── testimonials/             # Testimonials
│   ├── theme/                    # Theme utilities
│   ├── tracking-sdk/             # Tracking SDK
│   ├── tracking-server/          # Server tracking
│   ├── validations/              # Validation schemas
│   ├── whatsapp/                 # WhatsApp integration
│   └── utils.ts                  # General utilities
├── stores/                       # Zustand stores
│   ├── customers-crm-store.ts    # Customer CRM store
│   ├── financial-dashboard-store.ts # Financial dashboard
│   ├── orders-operations-store.ts # Order operations
│   └── payments-console-store.ts  # Payments console
├── supabase/                     # Supabase configuration
│   ├── functions/                # Edge functions
│   ├── migrations/               # Database migrations
│   └── checks/                   # Schema validation
├── cookie-bite-python/           # Python microservice
│   ├── core/                     # Core Python modules
│   ├── recommendation/           # ML recommendations
│   └── services/                 # Python services
├── services/                     # External services
│   └── whatsapp-bridge/          # WhatsApp bridge service
├── scripts/                      # Utility scripts
├── __tests__/                    # Test files
├── e2e/                          # E2E tests
├── hooks/                        # Custom hooks
├── types/                        # TypeScript type definitions
├── prompts/                      # AI prompts
├── docs/                         # Documentation
├── public/                       # Static assets
└── config/                       # Configuration files
```

---

## All Pages & Routes

### Public Site Pages `(site)/`

| Route | Page | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Homepage with hero, featured products, sections |
| `/shop` | `shop/page.tsx` | Product listing with filters |
| `/shop/[slug]` | `shop/[slug]/page.tsx` | Product detail page (PDP) |
| `/cart` | `cart/page.tsx` | Shopping cart |
| `/checkout` | `checkout/page.tsx` | Checkout flow |
| `/checkout/thank-you` | `checkout/thank-you/page.tsx` | Order confirmation |
| `/checkout/paymob-response` | `checkout/paymob-response/page.tsx` | Paymob callback |
| `/gift-box` | `gift-box/page.tsx` | Gift box builder |
| `/gift-box/build` | `gift-box/build/page.tsx` | Gift box creation |
| `/gift-preview/[token]` | `gift-preview/[token]/page.tsx` | Shared gift box preview |
| `/gift-reveal/[token]` | `gift-reveal/[token]/page.tsx` | Gift reveal page |
| `/mystery-box` | `mystery-box/page.tsx` | Mystery box generator |
| `/account` | `account/page.tsx` | User account dashboard |
| `/account/orders` | `account/orders/page.tsx` | Order history |
| `/account/addresses` | `account/addresses/page.tsx` | Address management |
| `/account/payment-methods` | `account/payment-methods/page.tsx` | Saved payment methods |
| `/account/complete-profile` | `account/complete-profile/page.tsx` | Profile completion |
| `/blog` | `blog/page.tsx` | Blog listing |
| `/blog/[slug]` | `blog/[slug]/page.tsx` | Blog post |
| `/contact` | `contact/page.tsx` | Contact form |
| `/our-story` | `our-story/page.tsx` | Brand story |
| `/our-cookies` | `our-cookies/page.tsx` | Product information |
| `/search` | `search/page.tsx` | Search results |
| `/help/faq` | `help/faq/page.tsx` | FAQ page |
| `/help/returns` | `help/returns/page.tsx` | Returns policy |
| `/privacy` | `privacy/page.tsx` | Privacy policy |
| `/terms` | `terms/page.tsx` | Terms of service |
| `/corporate-gifting` | `corporate-gifting/page.tsx` | B2B corporate gifting |

### Admin Dashboard Pages `(admin)/admin/`

| Route | Module | Description |
|-------|--------|-------------|
| `/admin` | Dashboard | Admin dashboard overview |
| `/admin/products` | Products | Product catalog management |
| `/admin/orders` | Orders | Order management |
| `/admin/orders/new` | Orders | Create manual order |
| `/admin/customers` | Customers | Customer CRM |
| `/admin/customers/new` | Customers | Add customer |
| `/admin/discounts` | Discounts | Promo codes & discounts |
| `/admin/offers` | Offers | Special offers |
| `/admin/reports` | Reports | Business reports |
| `/admin/financial` | Financial | Financial dashboard |
| `/admin/invoices` | Invoices | Invoice management |
| `/admin/payments` | Payments | Payment console |
| `/admin/shipping` | Shipping | Shipping zones & rates |
| `/admin/roles` | Roles | Role & permission management |
| `/admin/settings` | Settings | General settings |
| `/admin/audit-logs` | Audit Logs | Activity logs |
| `/admin/media` | Media | Media library |
| `/admin/cms` | CMS | Content management |
| `/admin/email` | Email | Email management |
| `/admin/email/automation` | Email | Email automation |
| `/admin/email/contacts` | Email | Contact management |
| `/admin/email/logs` | Email | Email logs |
| `/admin/email/failed` | Email | Failed emails |
| `/admin/email/queue` | Email | Email queue |
| `/admin/email/settings` | Email | Email settings |
| `/admin/analytics` | Analytics | Analytics dashboard |
| `/admin/analytics/funnels` | Analytics | Conversion funnels |
| `/admin/analytics/heatmap` | Analytics | Heatmap analytics |
| `/admin/analytics/insights` | Analytics | AI insights |
| `/admin/analytics/realtime` | Analytics | Real-time analytics |
| `/admin/analytics/sessions` | Analytics | User sessions |
| `/admin/analytics/sessions/[id]` | Analytics | Session details |
| `/admin/analytics/recordings` | Analytics | Session recordings |
| `/admin/analytics/recordings/[session]` | Analytics | Recording details |
| `/admin/announcements` | Announcements | Announcement management |
| `/admin/copilot` | Copilot | AI admin assistant |
| `/admin/gift-box` | Gift Box | Gift box management |
| `/admin/gift-box/sizes` | Gift Box | Box size management |
| `/admin/kitchen` | Kitchen | Kitchen display system |
| `/admin/mr-brownie` | Mr. Brownie | AI chatbot management |
| `/admin/template-library` | Templates | Design templates |
| `/admin/addons` | Addons | Product add-ons |

### Authentication Pages `(auth)/`

| Route | Description |
|-------|-------------|
| `/sign-in` | Login page |
| `/sign-up` | Registration page |
| `/forgot-password` | Password recovery |
| `/reset-password` | Password reset |
| `/auth/callback` | Supabase auth callback |

### Error Pages

| Route | Description |
|-------|-------------|
| `/403` | Forbidden access page |
| Global error boundary | Error handling |

---

## All API Routes

### Webhooks

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/clerk` | POST | Clerk webhook handler (deprecated) |
| `/api/webhooks/paymob` | POST | Paymob payment webhook |
| `/api/webhooks/sanity` | POST | Sanity CMS webhook |

### Products API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/products` | GET | List products with filters |
| `/api/products/[slug]` | GET | Get single product by slug |
| `/api/products/search` | GET | Search products |

### Cart API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/cart` | GET/POST | Get/update cart |
| `/api/cart/abandon` | POST | Track abandoned cart |
| `/api/cart/recover/[token]` | GET | Recover abandoned cart |

### Orders API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/orders` | GET/POST | List/create orders |
| `/api/orders/[id]` | GET/PATCH/DELETE | Order details/update |
| `/api/orders/[id]/cancel` | POST | Cancel order |
| `/api/orders/[id]/reorder` | POST | Reorder gift box |
| `/api/orders/[id]/reveal` | GET/PATCH | Gift reveal |

### Checkout API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/checkout/paymob/intention` | POST | Create Paymob payment intention |
| `/api/checkout/validate` | POST | Validate checkout data |

### Payments API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/payments/paymob/iframe` | POST | Get Paymob iframe URL |
| `/api/payments/paymob/validate` | POST | Validate Paymob response |

### Account API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/account/profile` | GET/PATCH | User profile |
| `/api/account/addresses` | GET/POST | User addresses |
| `/api/account/addresses/[id]` | PATCH/DELETE | Address operations |
| `/api/account/payment-methods` | GET/POST | Payment methods |
| `/api/account/payment-methods/[id]` | PATCH/DELETE | Payment method operations |
| `/api/account/testimonials` | GET/POST | Customer testimonials |
| `/api/account/data-export` | GET | Export user data |
| `/api/account/provision` | POST | Provision user account |
| `/api/account/admin-nav` | GET | Admin navigation data |

### Wishlist API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/wishlist` | GET/POST | Wishlist operations |
| `/api/wishlist/[productId]` | DELETE | Remove from wishlist |
| `/api/wishlist/share/[token]` | GET | Shared wishlist |

### Loyalty API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/loyalty` | GET | Loyalty points & rewards |
| `/api/loyalty/referral` | GET/POST | Referral code |
| `/api/loyalty/redeem` | POST | Redeem points |

### Promo API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/promo/validate` | POST | Validate promo code |

### Gift Box API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/gift-box` | GET/POST | Gift box operations |
| `/api/gift-box/[id]` | GET/PATCH/DELETE | Gift box details |
| `/api/gift-box/[id]/add-to-cart` | POST | Add to cart |
| `/api/gift-box/share` | POST | Create share link |
| `/api/gift-box/share/[token]` | GET | Get shared box |

### Mystery Box API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/mystery-box/generate` | POST | Generate mystery box |

### Corporate API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/corporate/bulk-delivery` | POST | B2B bulk delivery |

### Chat & AI API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/mr-brownie/chat` | POST | AI chat endpoint |
| `/api/mr-brownie/ambient` | POST | Ambient messages |
| `/api/mr-brownie/history` | GET | Chat history |
| `/api/mr-brownie/guest-session` | POST | Create guest session |
| `/api/chat/history` | GET | Chat history |
| `/api/chat/save` | POST | Save message |
| `/api/chat/clear` | POST | Clear chat |
| `/api/chat/handover` | POST | Handover guest to user |

### Notifications API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/notifications/order-status` | POST | Order status notification |
| `/api/notifications/order-confirmed` | POST | Order confirmation |
| `/api/push/subscribe` | POST | Subscribe to push |
| `/api/push/send` | POST | Send push notification |

### Contact API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/contact` | POST | Contact form submission |
| `/api/newsletter` | POST | Newsletter subscription |

### Admin API

#### Products
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/products` | GET/POST | Product CRUD |
| `/api/admin/products/[id]` | PATCH/DELETE | Product operations |
| `/api/admin/products/upload-image` | POST | Upload product image |
| `/api/admin/products/sync` | POST | Sync products |

#### Orders
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/orders` | GET | List orders |
| `/api/admin/orders/[id]` | GET/PATCH | Order operations |
| `/api/admin/orders/[id]/cancel` | POST | Cancel order |
| `/api/admin/orders/[id]/refund` | POST | Refund order |

#### Customers
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/customers` | GET | List customers |
| `/api/admin/customers/[id]` | GET/PATCH | Customer operations |
| `/api/admin/customers/[id]/block` | POST | Block customer |
| `/api/admin/customers/sync` | POST | Sync customers |
| `/api/admin/customers/campaign` | POST | Customer campaign |
| `/api/admin/customers/import-newsletter` | POST | Import newsletter |

#### Discounts
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/discounts` | GET/POST | Discount CRUD |
| `/api/admin/discounts/[id]` | PATCH/DELETE | Discount operations |
| `/api/admin/discounts/[id]/duplicate` | POST | Duplicate discount |
| `/api/admin/discounts/commerce-settings` | GET | Commerce settings |

#### Addons
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/addons` | GET/POST | Addon CRUD |
| `/api/admin/addons/ai-assist` | POST | AI assist for addons |
| `/api/admin/addons/link-all` | POST | Link all addons |
| `/api/admin/addon-categories` | GET/POST | Addon categories |

#### Analytics
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/analytics` | GET | Analytics data |
| `/api/admin/dashboard/kpis` | GET | Dashboard KPIs |

#### Announcements
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/announcements` | GET/POST | Announcement CRUD |
| `/api/admin/announcements/[id]` | PATCH/DELETE | Announcement operations |
| `/api/admin/announcements/ai-assist` | POST | AI assist |
| `/api/admin/announcements/ai-suggest` | POST | AI suggestions |

#### Audit Logs
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/audit-logs` | GET | Audit logs |

#### Copilot
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/copilot/chat` | POST | Admin AI chat |
| `/api/admin/copilot/memory` | GET/PATCH | AI memory |
| `/api/admin/copilot/prompt` | GET/PATCH | AI prompts |

#### Email
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/email` | GET | Email overview |
| `/api/admin/email/dashboard` | GET | Email dashboard |
| `/api/admin/email/settings` | GET/PATCH | Email settings |
| `/api/admin/email/templates` | GET/POST | Email templates |
| `/api/admin/email/templates/sync-library` | POST | Sync templates |
| `/api/admin/email/templates/sync-and-map` | POST | Sync and map |
| `/api/admin/email/contacts` | GET | Contact list |
| `/api/admin/email/contacts/[ref]` | PATCH/DELETE | Contact operations |
| `/api/admin/email/logs` | GET | Email logs |
| `/api/admin/email/failed` | GET | Failed emails |
| `/api/admin/email/queue` | GET | Email queue |
| `/api/admin/email/event-mappings` | GET/PATCH | Event mappings |
| `/api/admin/email/automation-controls` | POST | Automation controls |

#### Financial
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/financial` | GET | Financial overview |
| `/api/admin/financial/expenses/[id]` | PATCH/DELETE | Expense operations |

#### Invoices
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/invoices` | GET/POST | Invoice CRUD |

#### Kitchen
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/kitchen/orders` | GET | Kitchen orders |

#### Media
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/media` | GET/POST | Media library |

#### Payments
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/payments` | GET | Payment console |
| `/api/admin/payments/summary` | GET | Payment summary |

#### Reports
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/reports` | GET | Reports overview |
| `/api/admin/reports/gift-addon-insights` | GET | Gift/addon insights |

#### Roles
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/roles` | GET | Role matrix |
| `/api/admin/roles/matrix` | GET | Permission matrix |

#### Settings
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/settings` | GET/PATCH | General settings |
| `/api/admin/settings/health` | GET | Health check |

#### Shipping
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/shipping-zones` | GET/POST | Shipping zones |
| `/api/admin/shipping-zones/reorder` | POST | Reorder zones |

#### Automation
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/automation/run` | POST | Run automation |
| `/api/admin/automation/status` | GET | Automation status |

#### Auth
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/auth/strip-oauth-passwords` | POST | Strip OAuth passwords |

#### Push
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/push/broadcast` | POST | Broadcast push |

#### Product Assistant
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/product-assistant/chat` | POST | Product assistant chat |

#### Notifications
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/notifications/templates` | GET | Notification templates |

### Utility API

| Route | Method | Description |
|-------|--------|-------------|
| `/api/revalidate` | POST | Revalidate pages |
| `/api/health` | GET | Health check |
| `/api/cron/*` | POST | Cron job endpoints |

---

## All Components

### Account Components (`components/account/`)

| Component | Description |
|-----------|-------------|
| `account-addresses-page-client.tsx` | Addresses page client |
| `account-hash-scroll.tsx` | Hash scroll navigation |
| `account-orders-list.tsx` | Orders list |
| `account-page-client.tsx` | Account page client |
| `loyalty-dashboard.tsx` | Loyalty points dashboard |
| `loyalty-referral-card.tsx` | Referral card |
| `order-detail-card.tsx` | Order detail card |
| `order-status-tracker.tsx` | Order status tracker |
| `profile-completion-banner.tsx` | Profile completion banner |
| `referral-qr-code.tsx` | Referral QR code |
| `saved-payment-methods-card.tsx` | Saved payment methods |
| `wishlist-card.tsx` | Wishlist card |
| `wishlist-share-modal.tsx` | Wishlist share modal |

### Admin Components (`components/admin/`)

#### Addons
- `addon-categories-table.tsx` - Addon categories table
- `addon-form-drawer.tsx` - Addon form drawer
- `addon-linking-modal.tsx` - Addon linking modal
- `addons-table.tsx` - Addons table

#### Analytics
- `analytics-funnel-chart.tsx` - Funnel chart
- `analytics-heatmap.tsx` - Heatmap visualization
- `analytics-insights-card.tsx` - AI insights card
- `analytics-realtime-card.tsx` - Real-time analytics
- `analytics-sessions-table.tsx` - Sessions table
- `session-recording-player.tsx` - Recording player

#### Announcements
- `announcement-banner.tsx` - Announcement banner
- `announcement-form-drawer.tsx` - Announcement form
- `announcements-table.tsx` - Announcements table

#### General Admin
- `admin-badge.tsx` - Admin badge
- `admin-bilingual-label.tsx` - Bilingual label
- `admin-cms-page-content.tsx` - CMS page content
- `admin-console-nav.tsx` - Admin navigation
- `admin-console-nav-icons.tsx` - Nav icons
- `admin-label.tsx` - Admin label
- `admin-layout.tsx` - Admin layout
- `admin-page-header.tsx` - Page header

#### Various Admin Modules
- `automation-controls.tsx` - Automation controls
- `automation-status-card.tsx` - Automation status
- `audit-logs-table.tsx` - Audit logs table
- `copilot-chat-panel.tsx` - AI copilot chat
- `copilot-memory-editor.tsx` - AI memory editor
- `copilot-prompt-editor.tsx` - AI prompt editor
- `crm-table.tsx` - Customer CRM table
- `customer-form-drawer.tsx` - Customer form
- `delivery-scheduler.tsx` - Delivery scheduler
- `discount-form-drawer.tsx` - Discount form
- `discounts-table.tsx` - Discounts table
- `email-automation-rules.tsx` - Email automation rules
- `email-contacts-table.tsx` - Email contacts table
- `email-dashboard-cards.tsx` - Email dashboard cards
- `email-event-mapping-editor.tsx` - Event mapping editor
- `email-failed-table.tsx` - Failed emails table
- `email-logs-table.tsx` - Email logs table
- `email-queue-table.tsx` - Email queue table
- `email-settings-form.tsx` - Email settings form
- `email-template-editor.tsx` - Email template editor
- `email-templates-table.tsx` - Email templates table
- `financial-dashboard.tsx` - Financial dashboard
- `financial-expenses-form.tsx` - Expenses form
- `gift-box-form-drawer.tsx` - Gift box form
- `gift-box-sizes-table.tsx` - Gift box sizes table
- `invoice-form-drawer.tsx` - Invoice form
- `invoices-table.tsx` - Invoices table
- `kitchen-display.tsx` - Kitchen display system
- `media-library.tsx` - Media library
- `mr-brownie-dashboard.tsx` - Mr. Brownie dashboard
- `offers-table.tsx` - Offers table
- `order-form-drawer.tsx` - Order form
- `orders-table.tsx` - Orders table
- `payments-console.tsx` - Payments console
- `product-form-drawer.tsx` - Product form
- `products-table.tsx` - Products table
- `reports-dashboard.tsx` - Reports dashboard
- `roles-permissions-matrix.tsx` - Roles matrix
- `roles-table.tsx` - Roles table
- `shipping-zones-table.tsx` - Shipping zones table
- `settings-form.tsx` - Settings form

### AI Chat Components (`components/ai-chat/`)

| Component | Description |
|-----------|-------------|
| `ai-chat-app.tsx` | AI chat application |
| `chat-input.tsx` | Chat input |
| `chat-window.tsx` | Chat window |
| `chat-message.tsx` | Chat message |
| `typing-indicator.tsx` | Typing indicator |

### Analytics Components (`components/analytics/`)

| Component | Description |
|-----------|-------------|
| `deferred-ga4-tracker.tsx` | Deferred GA4 tracker |
| `ga4-tracker.tsx` | GA4 tracker |

### Announcement Components (`components/announcements/`)

| Component | Description |
|-----------|-------------|
| `announcement-bar.tsx` | Announcement bar |
| `announcement-modal.tsx` | Announcement modal |
| `announcement-ticker.tsx` | Announcement ticker |

### Auth Components (`components/auth/`)

| Component | Description |
|-----------|-------------|
| `auth-guard.tsx` | Auth guard |
| `auth-layout.tsx` | Auth layout |
| `auth-provider.tsx` | Auth provider |
| `sign-in-form.tsx` | Sign in form |
| `sign-up-form.tsx` | Sign up form |
| `forgot-password-form.tsx` | Forgot password form |
| `reset-password-form.tsx` | Reset password form |

### Brand Components (`components/brand/`)

| Component | Description |
|-----------|-------------|
| `cookie-bite-logo.tsx` | Logo component |
| `brand-colors.tsx` | Brand colors |

### Cart Components (`components/cart/`)

| Component | Description |
|-----------|-------------|
| `cart-drawer.tsx` | Cart drawer |
| `cart-item.tsx` | Cart item |
| `cart-summary.tsx` | Cart summary |
| `free-delivery-progress.tsx` | Free delivery progress |
| `cart-provider.tsx` | Cart provider |

### Checkout Components (`components/checkout/`)

| Component | Description |
|-----------|-------------|
| `checkout-form.tsx` | Checkout form |
| `checkout-summary.tsx` | Checkout summary |
| `delivery-scheduler.tsx` | Delivery scheduler |
| `payment-method-selector.tsx` | Payment method selector |

### Contact Components (`components/contact/`)

| Component | Description |
|-----------|-------------|
| `contact-form.tsx` | Contact form |

### Debug Components (`components/debug/`)

| Component | Description |
|-----------|-------------|
| `debug-panel.tsx` | Debug panel |
| `error-boundary.tsx` | Error boundary |

### Gift Box Components (`components/gift-box/`)

| Component | Description |
|-----------|-------------|
| `gift-box-card.tsx` | Gift box card |
| `gift-box-preview.tsx` | Gift box preview |
| `gift-box-share-button.tsx` | Share button |

### Gift Box Builder Components (`components/gift-box-builder/`)

| Component | Description |
|-----------|-------------|
| `box-size-selector.tsx` | Box size selector |
| `occasion-template-bar.tsx` | Occasion templates |
| `gift-box-builder.tsx` | Main builder |
| `product-selector.tsx` | Product selector |
| `addon-selector.tsx` | Addon selector |
| `gift-summary.tsx` | Gift summary |

### Invoice Components (`components/invoices/`)

| Component | Description |
|-----------|-------------|
| `invoice-preview.tsx` | Invoice preview |

### Layout Components (`components/layout/`)

| Component | Description |
|-----------|-------------|
| `site-header.tsx` | Site header |
| `site-footer.tsx` | Site footer |
| `mobile-header.tsx` | Mobile header |
| `mobile-tab-bar.tsx` | Mobile tab bar |
| `announcement-bar.tsx` | Announcement bar |
| `navigation-menu.tsx` | Navigation menu |
| `search-bar.tsx` | Search bar |
| `language-switcher.tsx` | Language switcher |
| `theme-toggle.tsx` | Theme toggle |
| `cart-icon.tsx` | Cart icon |
| `user-menu.tsx` | User menu |

### Mr. Brownie Components (`components/mr-brownie/`)

| Component | Description |
|-----------|-------------|
| `mr-brownie-widget.tsx` | AI chatbot widget |
| `mr-brownie-chat.tsx` | Chat interface |
| `mr-brownie-avatar.tsx` | Avatar |
| `mr-brownie-message.tsx` | Message component |

### Mystery Box Components (`components/mystery-box/`)

| Component | Description |
|-----------|-------------|
| `mystery-box-generator.tsx` | Mystery box generator |
| `mystery-box-reveal.tsx` | Mystery box reveal |

### Page Components (`components/pages/`)

| Component | Description |
|-----------|-------------|
| `home-hero.tsx` | Homepage hero |
| `home-featured.tsx` | Featured products |
| `home-categories.tsx` | Categories section |
| `home-testimonials.tsx` | Testimonials section |
| `home-newsletter.tsx` | Newsletter section |
| `shop-hero.tsx` | Shop hero |
| `blog-hero.tsx` | Blog hero |
| `contact-hero.tsx` | Contact hero |
| `account-hero.tsx` | Account hero |
| `checkout-hero.tsx` | Checkout hero |
| `gift-box-hero.tsx` | Gift box hero |
| `corporate-hero.tsx` | Corporate hero |

### Print Components (`components/print/`)

| Component | Description |
|-----------|-------------|
| `print-invoice.tsx` | Print invoice |
| `print-order.tsx` | Print order |

### Product Components (`components/product/`)

| Component | Description |
|-----------|-------------|
| `product-card.tsx` | Product card |
| `product-grid.tsx` | Product grid |
| `product-filters.tsx` | Product filters |
| `product-sort.tsx` | Product sort |
| `product-shared-image.tsx` | Shared image component |
| `product-variant-selector.tsx` | Variant selector |
| `product-add-to-cart.tsx` | Add to cart button |

### Provider Components (`components/providers/`)

| Component | Description |
|-----------|-------------|
| `cart-provider.tsx` | Cart state provider |
| `theme-provider.tsx` | Theme provider |
| `language-provider.tsx` | Language provider |
| `auth-provider.tsx` | Auth provider |
| `toast-provider.tsx` | Toast notifications |
| `query-provider.tsx` | React Query provider |

### PWA Components (`components/pwa/`)

| Component | Description |
|-----------|-------------|
| `pwa-install-prompt.tsx` | PWA install prompt |
| `pwa-update-banner.tsx` | PWA update banner |

### Section Components (`components/sections/`)

| Component | Description |
|-----------|-------------|
| `hero-section.tsx` | Hero section |
| `features-section.tsx` | Features section |
| `testimonials-section.tsx` | Testimonials section |
| `newsletter-section.tsx` | Newsletter section |
| `cta-section.tsx` | CTA section |
| `social-proof-section.tsx` | Social proof |
| `categories-section.tsx` | Categories section |

### SEO Components (`components/seo/`)

| Component | Description |
|-----------|-------------|
| `json-ld.tsx` | JSON-LD structured data |
| `meta-tags.tsx` | Meta tags |
| `open-graph.tsx` | Open Graph tags |
| `twitter-card.tsx` | Twitter card |

### Shop Components (`components/shop/`)

| Component | Description |
|-----------|-------------|
| `shop-client.tsx` | Shop client component |
| `shop-sidebar.tsx` | Shop sidebar |
| `shop-toolbar.tsx` | Shop toolbar |
| `pdp-actions.tsx` | PDP actions |
| `pdp-shared-hero.tsx` | PDP hero |
| `product-recommendations.tsx` | Product recommendations |

### Tracking Components (`components/tracking/`)

| Component | Description |
|-----------|-------------|
| `order-tracker.tsx` | Order tracker |
| `tracking-map.tsx` | Tracking map |
| `tracking-timeline.tsx` | Tracking timeline |
| `tracking-status-badge.tsx` | Status badge |

### UI Components (`components/ui/`)

| Component | Description |
|-----------|-------------|
| `button.tsx` | Button component |
| `input.tsx` | Input component |
| `select.tsx` | Select component |
| `textarea.tsx` | Textarea component |
| `checkbox.tsx` | Checkbox component |
| `radio.tsx` | Radio component |
| `switch.tsx` | Switch component |
| `slider.tsx` | Slider component |
| `dialog.tsx` | Dialog component |
| `dropdown.tsx` | Dropdown component |
| `tabs.tsx` | Tabs component |
| `badge.tsx` | Badge component |
| `avatar.tsx` | Avatar component |
| `card.tsx` | Card component |
| `table.tsx` | Table component |

### Wishlist Components (`components/wishlist/`)

| Component | Description |
|-----------|-------------|
| `wishlist-button.tsx` | Wishlist button |
| `wishlist-drawer.tsx` | Wishlist drawer |

---

## Database Schema

### Core Tables

#### users
- `id` (UUID, primary key)
- `clerk_user_id` (UUID, nullable - deprecated)
- `email` (text, unique)
- `full_name` (text)
- `phone` (text, nullable)
- `role` (enum: owner, admin, staff, customer)
- `loyalty_points` (integer, default 0)
- `referral_code` (text, unique)
- `referred_by` (UUID, nullable)
- `welcome_email_sent` (boolean, default false)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### products
- `id` (UUID, primary key)
- `slug` (text, unique)
- `name_en` (text)
- `name_ar` (text)
- `description_en` (text)
- `description_ar` (text)
- `price_egp` (numeric)
- `compare_at_price` (numeric, nullable)
- `cost_price` (numeric, nullable)
- `stock_quantity` (integer)
- `is_active` (boolean, default true)
- `is_featured` (boolean, default false)
- `category_id` (UUID, nullable)
- `image_url` (text)
- `video_url` (text, nullable)
- `weight` (numeric, nullable)
- `tags` (text[], nullable)
- `seo_title_en` (text, nullable)
- `seo_title_ar` (text, nullable)
- `seo_description_en` (text, nullable)
- `seo_description_ar` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### product_variants
- `id` (UUID, primary key)
- `product_id` (UUID, foreign key)
- `size` (text, nullable)
- `price_adjustment` (numeric, default 0)
- `stock_quantity` (integer)
- `sku` (text, nullable)

#### product_addons
- `id` (UUID, primary key)
- `product_id` (UUID, foreign key)
- `addon_id` (UUID, foreign key)
- `is_required` (boolean, default false)
- `default_selected` (boolean, default false)

#### addon_categories
- `id` (UUID, primary key)
- `name_en` (text)
- `name_ar` (text)
- `sort_order` (integer, default 0)

#### addons
- `id` (UUID, primary key)
- `category_id` (UUID, foreign key, nullable)
- `name_en` (text)
- `name_ar` (text)
- `description_en` (text, nullable)
- `description_ar` (text, nullable)
- `price_egp` (numeric)
- `image_url` (text, nullable)
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)

#### orders
- `id` (UUID, primary key)
- `order_number` (text, unique)
- `user_id` (UUID, foreign key, nullable)
- `guest_email` (text, nullable)
- `guest_name` (text, nullable)
- `guest_phone` (text, nullable)
- `status` (enum: pending, confirmed, processing, shipped, delivered, cancelled, refunded)
- `payment_status` (enum: pending, paid, failed, refunded)
- `payment_method` (enum: card, cod, wallet)
- `subtotal_egp` (numeric)
- `delivery_fee_egp` (numeric)
- `discount_egp` (numeric, default 0)
- `total_egp` (numeric)
- `currency` (text, default 'EGP')
- `shipping_address` (jsonb)
- `billing_address` (jsonb, nullable)
- `delivery_notes` (text, nullable)
- `scheduled_delivery_date` (date, nullable)
- `scheduled_delivery_slot` (text, nullable)
- `recipient_name` (text, nullable)
- `recipient_phone` (text, nullable)
- `is_gift` (boolean, default false)
- `gift_message` (text, nullable)
- `gift_box_snapshot` (jsonb, nullable)
- `paymob_accept_order_id` (integer, nullable)
- `paymob_transaction_id` (text, nullable)
- `checkout_idempotency_key` (text, unique, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### order_items
- `id` (UUID, primary key)
- `order_id` (UUID, foreign key)
- `product_id` (UUID, foreign key)
- `variant_id` (UUID, foreign key, nullable)
- `quantity` (integer)
- `unit_price_egp` (numeric)
- `total_price_egp` (numeric)
- `product_snapshot` (jsonb)

#### addresses
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `label` (text)
- `recipient_name` (text)
- `phone` (text)
- `address_line1` (text)
- `address_line2` (text, nullable)
- `city` (text)
- `governorate` (text)
- `postal_code` (text, nullable)
- `is_default` (boolean, default false)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)
- `created_at` (timestamp)

#### payments
- `id` (UUID, primary key)
- `order_id` (UUID, foreign key)
- `amount_egp` (numeric)
- `payment_method` (enum: card, cod, wallet)
- `payment_status` (enum: pending, paid, failed, refunded)
- `transaction_id` (text, nullable)
- `paid_at` (timestamp, nullable)
- `created_at` (timestamp)

#### invoices
- `id` (UUID, primary key)
- `order_id` (UUID, foreign key, nullable)
- `invoice_number` (text, unique)
- `customer_id` (UUID, foreign key)
- `amount_egp` (numeric)
- `status` (enum: draft, sent, paid, overdue, cancelled)
- `due_date` (date, nullable)
- `paid_at` (timestamp, nullable)
- `notes` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### discounts
- `id` (UUID, primary key)
- `code` (text, unique)
- `type` (enum: percentage, fixed, free_shipping)
- `value` (numeric)
- `min_order_value` (numeric, nullable)
- `max_uses` (integer, nullable)
- `uses_count` (integer, default 0)
- `valid_from` (timestamp)
- `valid_until` (timestamp, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamp)

#### shipping_zones
- `id` (UUID, primary key)
- `name_en` (text)
- `name_ar` (text)
- `cities` (text[])
- `base_fee_egp` (numeric)
- `delivery_days` (integer)
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)

#### loyalty_transactions
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `points` (integer)
- `type` (enum: earned, redeemed, expired, adjusted)
- `reason` (text)
- `reference_id` (UUID, nullable)
- `created_at` (timestamp)

#### testimonials
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key, nullable)
- `order_id` (UUID, foreign key, nullable)
- `rating` (integer, 1-5)
- `comment_en` (text, nullable)
- `comment_ar` (text, nullable)
- `is_approved` (boolean, default false)
- `is_featured` (boolean, default false)
- `helpful_count` (integer, default 0)
- `photo_url` (text, nullable)
- `created_at` (timestamp)

#### contact_messages
- `id` (UUID, primary key)
- `name` (text)
- `email` (text)
- `phone` (text, nullable)
- `subject` (text)
- `message` (text)
- `status` (enum: new, in_progress, resolved, closed)
- `created_at` (timestamp)

#### newsletter_subscribers
- `id` (UUID, primary key)
- `email` (text, unique)
- `status` (enum: active, unsubscribed, bounced)
- `subscribed_at` (timestamp)

#### chat_messages
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key, nullable)
- `session_id` (text, nullable)
- `role` (enum: user, assistant)
- `content` (text)
- `metadata` (jsonb, nullable)
- `created_at` (timestamp)

#### mr_brownie_training
- `id` (UUID, primary key)
- `question` (text)
- `answer` (text)
- `category` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamp)

#### mr_brownie_turn_logs
- `id` (UUID, primary key)
- `session_id` (text)
- `user_query` (text)
- `ai_response` (text)
- `context_used` (jsonb, nullable)
- `model_used` (text, nullable)
- `latency_ms` (integer, nullable)
- `rating` (integer, nullable)
- `created_at` (timestamp)

#### announcements
- `id` (UUID, primary key)
- `title_en` (text)
- `title_ar` (text)
- `content_en` (text)
- `content_ar` (text)
- `type` (enum: info, promo, alert)
- `target_audience` (enum: all, customers, guests)
- `is_active` (boolean, default true)
- `start_date` (timestamp, nullable)
- `end_date` (timestamp, nullable)
- `priority` (integer, default 0)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### notification_jobs
- `id` (UUID, primary key)
- `type` (enum: email, push, whatsapp)
- `recipient` (text)
- `template_id` (text, nullable)
- `data` (jsonb)
- `status` (enum: pending, sent, failed)
- `attempts` (integer, default 0)
- `scheduled_at` (timestamp, nullable)
- `sent_at` (timestamp, nullable)
- `error_message` (text, nullable)
- `created_at` (timestamp)

#### email_templates
- `id` (UUID, primary key)
- `name` (text, unique)
- `subject_en` (text)
- `subject_ar` (text)
- `body_html_en` (text)
- `body_html_ar` (text)
- `event_type` (text, nullable)
- `is_active` (boolean, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### email_automation_rules
- `id` (UUID, primary key)
- `name` (text)
- `event_type` (text)
- `conditions` (jsonb)
- `template_id` (UUID, foreign key)
- `is_active` (boolean, default true)
- `created_at` (timestamp)

#### audit_logs
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `action` (text)
- `entity_type` (text)
- `entity_id` (UUID, nullable)
- `changes` (jsonb, nullable)
- `ip_address` (text, nullable)
- `user_agent` (text, nullable)
- `created_at` (timestamp)

#### user_events
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key, nullable)
- `session_id` (text, nullable)
- `event_type` (text)
- `event_data` (jsonb, nullable)
- `page_url` (text, nullable)
- `created_at` (timestamp)

#### abandoned_carts
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key, nullable)
- `guest_email` (text, nullable)
- `cart_data` (jsonb)
- `recovery_token` (text, unique)
- `recovered_at` (timestamp, nullable)
- `reminder_sent_at` (timestamp, nullable)
- `created_at` (timestamp)

#### gift_box_shares
- `id` (UUID, primary key)
- `gift_box_id` (UUID)
- `share_token` (text, unique)
- `shared_by` (UUID, foreign key)
- `view_count` (integer, default 0)
- `expires_at` (timestamp, nullable)
- `created_at` (timestamp)

#### mystery_box_rules
- `id` (UUID, primary key)
- `name_en` (text)
- `name_ar` (text)
- `price_egp` (numeric)
- `min_items` (integer)
- `max_items` (integer)
- `product_categories` (text[], nullable)
- `is_active` (boolean, default true)

#### occasion_templates
- `id` (UUID, primary key)
- `name_en` (text)
- `name_ar` (text)
- `description_en` (text)
- `description_ar` (text)
- `icon` (text, nullable)
- `suggested_products` (UUID[], nullable)
- `suggested_addons` (UUID[], nullable)
- `message_template_en` (text, nullable)
- `message_template_ar` (text, nullable)
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)

#### corporate_bulk_requests
- `id` (UUID, primary key)
- `company_name` (text)
- `contact_name` (text)
- `contact_email` (text)
- `contact_phone` (text)
- `quantity` (integer)
- `budget_per_unit` (numeric, nullable)
- `delivery_date` (date, nullable)
- `requirements` (text, nullable)
- `status` (enum: new, contacted, quoted, in_progress, completed, cancelled)
- `created_at` (timestamp)

#### saved_payment_methods
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `provider` (text)
- `provider_token` (text)
- `last_four` (text)
- `expiry_month` (integer)
- `expiry_year` (integer)
- `is_default` (boolean, default false)
- `created_at` (timestamp)

#### blocked_emails
- `id` (UUID, primary key)
- `email` (text, unique)
- `reason` (text, nullable)
- `blocked_at` (timestamp)

#### admin_presence
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `last_seen` (timestamp)
- `is_online` (boolean, default false)

#### store_business_settings
- `id` (UUID, primary key)
- `store_name_en` (text)
- `store_name_ar` (text)
- `store_email` (text)
- `store_phone` (text)
- `social_media_links` (jsonb, nullable)
- `updated_at` (timestamp)

#### store_commerce_settings
- `id` (UUID, primary key)
- `currency` (text, default 'EGP')
- `tax_rate` (numeric, default 0)
- `delivery_fee_egp` (numeric)
- `free_delivery_threshold_egp` (numeric)
- `min_order_value_egp` (numeric, nullable)
- `updated_at` (timestamp)

#### bundle_offers
- `id` (UUID, primary key)
- `name_en` (text)
- `name_ar` (text)
- `description_en` (text, nullable)
- `description_ar` (text, nullable)
- `product_ids` (UUID[])
- `discount_type` (enum: percentage, fixed)
- `discount_value` (numeric)
- `is_active` (boolean, default true)
- `valid_from` (timestamp)
- `valid_until` (timestamp, nullable)

---

## Environment Variables

### Required for Production

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `APP_BASE_URL` | Server base URL |
| `COOKIE_BITE_PRIMARY_DOMAIN` | Primary domain for middleware |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `PAYMOB_SECRET_KEY` | Paymob secret key |
| `PAYMOB_API_KEY` | Paymob API key |
| `PAYMOB_PUBLIC_KEY` | Paymob public key |
| `PAYMOB_HMAC_SECRET` | Paymob HMAC secret |
| `PAYMOB_INTEGRATION_ID_CARD` | Paymob card integration ID |
| `PAYMOB_INTEGRATION_ID_WALLET` | Paymob wallet integration ID |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Resend from email |
| `INTERNAL_API_SECRET` | Internal API secret for cron/webhooks |
| `REVALIDATE_SECRET` | Secret for revalidation endpoint |

### Optional but Recommended

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID |
| `SANITY_WEBHOOK_SECRET` | Sanity webhook secret |
| `GEMINI_API_KEY` | Google Gemini API key |
| `MR_BROWNIE_GEMINI_MODEL` | Gemini model for chatbot |
| `WHATSAPP_CLOUD_API_TOKEN` | WhatsApp API token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID |
| `REDIS_URL` | Redis connection URL |
| `PYTHON_API_URL` | Python microservice URL |

### Bootstrap Variables

| Variable | Description |
|----------|-------------|
| `OWNER_BOOTSTRAP_EMAIL` | Owner email for bootstrap |
| `ADMIN_BOOTSTRAP_EMAILS` | Admin emails (comma-separated) |
| `STAFF_BOOTSTRAP_EMAILS` | Staff emails (comma-separated) |

### Commerce Defaults

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_DELIVERY_FEE_EGP` | Default delivery fee |
| `NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD_EGP` | Free delivery threshold |
| `NEXT_PUBLIC_EGP_PER_USD` | Exchange rate |
| `NEXT_PUBLIC_FORCE_SEASON` | Force season (for testing) |

---

## Features & Functionality

### Implemented Features ✅

#### Phase 1 - Direct Sales
- ✅ Delivery scheduling with separate recipient
- ✅ Gift box reorder functionality
- ✅ Product add-ons linking (admin)
- ✅ Abandoned cart recovery

#### Phase 2 - Gifts & Loyalty
- ✅ Gift box share links
- ✅ Gift reveal page
- ✅ Mystery box generator
- ✅ Occasion templates
- ✅ Loyalty dashboard
- ✅ Double points on gift boxes
- ✅ Visual referral system
- ✅ Kitchen display system (admin)
- ✅ Urgent order alerts
- ✅ Gift/addon reports
- ✅ Mr. Brownie AI chatbot

#### Phase 3 - B2B
- ✅ Multi-address B2B orders
- ✅ Corporate gifting catalog

### Core Features

#### E-commerce
- Product catalog with variants
- Shopping cart with real-time updates
- Multi-payment methods (Paymob card, COD)
- Order tracking
- Guest checkout
- User accounts
- Address management
- Saved payment methods

#### Gift Box Builder
- Custom box creation
- Size selection
- Product selection
- Add-on selection
- Occasion templates
- Gift messages
- Share functionality
- Reorder capability

#### Loyalty System
- Points accumulation
- Referral codes
- Rewards redemption
- Points history
- Double points on special items

#### AI Features
- Mr. Brownie storefront chatbot
- Mrs. Cookie admin copilot
- Product recommendations
- AI-powered insights
- Chat history
- Training system

#### Marketing
- Email automation
- Newsletter management
- Announcement system
- Promo codes
- Bundle offers
- Corporate gifting

#### Admin Dashboard
- Product management
- Order management
- Customer CRM
- Financial reports
- Analytics dashboard
- Email management
- Media library
- Role-based access control
- Audit logs
- Kitchen display
- Shipping zones
- Invoice generation

#### Notifications
- Email notifications (Resend)
- WhatsApp notifications
- Push notifications
- Order status updates
- Abandoned cart reminders

---

## Integrations

### Payment - Paymob
- Card payments via hosted checkout
- Cash on delivery
- Webhook handling for payment confirmation
- HMAC signature verification
- Transaction tracking

### Authentication - Supabase Auth
- User registration/login
- Password reset
- Email verification
- Session management
- OAuth providers (optional)

### Database - Supabase
- PostgreSQL database
- Row Level Security (RLS)
- Real-time subscriptions
- Storage for files
- Edge functions

### Email - Resend
- Transactional emails
- Email templates
- Automation rules
- Contact management
- Delivery tracking

### CMS - Sanity
- Blog content
- Marketing pages
- Webhook revalidation
- Image optimization

### AI - Google Gemini
- Chatbot responses
- Product recommendations
- Content generation
- Insights generation

### Media - Cloudinary
- Image upload/optimization
- Video hosting
- Dynamic transformations
- CDN delivery

### Analytics - Google Analytics 4
- Page tracking
- Event tracking
- E-commerce tracking
- User behavior analysis

### Notifications - WhatsApp Cloud API
- Order confirmations
- Shipping updates
- Promotional messages

### Background Jobs - BullMQ
- Email queue
- Notification queue
- Abandoned cart reminders
- Optional Redis backend

---

## Security

### Middleware Security
- Rate limiting by endpoint
- Domain locking in production
- RBAC for admin routes
- Account protection
- API secret validation

### Data Security
- Environment variable validation
- Secret key management
- RLS policies on database
- Encrypted sensitive data
- Honeypot for forms

### Payment Security
- HMAC webhook verification
- Idempotency keys for orders
- Server-side payment processing
- No client-side secrets

### API Security
- CORS configuration
- CSP headers
- HSTS in production
- X-Frame-Options
- Referrer policy

### Authentication
- Secure session management
- Password hashing
- Email verification
- Rate limiting on auth endpoints

---

## Scripts & Tools

### Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript check |
| `npm run test` | Run Jest tests |
| `npm run test:e2e` | Run Playwright tests |

### Utility Scripts

| Script | Description |
|--------|-------------|
| `npm run analyze` | Analyze build size |
| `npm run paymob:normalize-env` | Normalize Paymob env vars |
| `npm run paymob:test` | Test Paymob integration |
| `npm run email:check` | Email diagnostics |
| `npm run supabase:healthcheck` | Supabase health check |
| `npm run security:audit` | Security audit |
| `npm run backup:supabase` | Backup Supabase |
| `npm run backup:supabase:restore` | Restore Supabase |

### Admin Scripts

| Script | Description |
|--------|-------------|
| `npm run mr-brownie:training-report` | AI training report |
| `npm run mr-brownie:auto-improve` | AI auto-improve |
| `npm run mr-brownie:weekly-report` | AI weekly report |
| `npm run copilot:check` | Admin copilot check |

### Deployment Scripts

| Script | Description |
|--------|-------------|
| `npm run deploy:github` | Deploy to GitHub |
| `npm run hostinger:env-audit` | Hostinger env audit |
| `npm run hostinger:checklist` | Hostinger deployment checklist |

### Python Microservice

| Script | Description |
|--------|-------------|
| `npm run python:up` | Start Python service |
| `npm run python:down` | Stop Python service |
| `npm run python:dev` | Python dev mode |
| `npm run python:health` | Python health check |
| `npm run python:retrain` | Retrain ML models |

---

## Testing

### Unit Tests (Jest)
- Location: `lib/__tests__/`
- Configuration: `jest.config.mjs`
- Coverage: Partial coverage for validations
- Run: `npm run test`

### E2E Tests (Playwright)
- Location: `e2e/`
- Configuration: `playwright.config.ts`
- Tests:
  - Smoke test (`smoke.spec.ts`)
  - Paymob checkout (`checkout-paymob.spec.ts`)
- Run: `npm run test:e2e`

### Test Coverage
- Validation schemas
- Utility functions
- API route handlers (partial)
- Component tests (limited)

---

## Deployment

### Production Build
```bash
npm run build
npm run start
```

### Standalone Mode
- Configured with `output: "standalone"`
- Runs via `server.mjs`
- Optimized for Node.js hosting

### Hostinger Deployment
1. Build project locally
2. Upload to Hostinger
3. Set Node version to 20+
4. Configure environment variables
5. Set start command to `npm run start`
6. Enable SSL

### Environment Requirements
- Node.js >= 20
- PostgreSQL (via Supabase)
- Redis (optional, for queues)
- All required environment variables

### Deployment Checklist
- [ ] Set production domain
- [ ] Configure Clerk/Supabase domains
- [ ] Set Paymob webhook URLs
- [ ] Configure Resend sender domain
- [ ] Set up cron jobs for notifications
- [ ] Configure Cloudinary
- [ ] Set up analytics
- [ ] Test payment flow
- [ ] Test email delivery
- [ ] Verify SSL certificate

---

## Monitoring & Maintenance

### Health Checks
- `/api/health` - General health
- `/api/admin/settings/health` - Admin health
- Supabase health check script

### Logs
- Application logs via logger
- Email logs in database
- Audit logs for admin actions
- Error tracking (optional webhook)

### Backups
- Supabase automated backups
- Manual backup script available
- Restore script available

### Performance
- Bundle analysis available
- Image optimization via Cloudinary
- PWA caching strategy
- CDN for static assets

---

## Documentation

### Existing Documentation
- `README.md` - Project overview
- `docs/WEBSITE_COMPLETE_REFERENCE.md` - Arabic reference
- `docs/FEATURES_IMPLEMENTATION_STATUS.md` - Feature status
- `docs/AI_CHAT_STREAMING.md` - AI chat documentation
- `docs/EMAIL_AUTOMATION.md` - Email automation guide
- `docs/paymob-webhook-setup.md` - Paymob setup

### Code Documentation
- TypeScript types in `types/`
- JSDoc comments in key files
- Component prop types
- API route documentation

---

## Support & Maintenance

### Common Issues
- Environment variable missing → Check `.env.example`
- Paymob webhook failing → Verify HMAC secret
- Email not sending → Check Resend API key
- Images not loading → Verify Cloudinary config
- Build failing → Check Node version >= 20

### Debug Mode
- Set `NODE_ENV=development`
- Check browser console
- Check server logs
- Use debug panel component

### Contact
- Owner email: Set via `OWNER_BOOTSTRAP_EMAIL`
- Store ops email: Set via `STORE_OPS_EMAIL`
- Admin alerts: Set via `ADMIN_ALERT_EMAIL`

---

*This blueprint is a comprehensive overview of the Cookie Bite e-commerce platform. For specific implementation details, refer to the source code and individual component files.*
