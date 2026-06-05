# Mr. Brownie & Mrs. Cookie — Implementation Tracker

## Agent split (authoritative)

| Agent | Surface | Who |
|-------|---------|-----|
| **Mr. Brownie** 🍫 | Storefront chat (FAB, gift box) | Guests & customers |
| **Mrs. Cookie** 🍪 | `/admin/copilot` + launcher FAB | **Owner & admin only** (not staff) |

Mrs. Cookie is **not** exposed in the customer storefront. Support tone on the shop uses Mr. Brownie in support mode.

## Phase 1 — MVP ✅

Dual storefront UX (later simplified to Mr. Brownie only), product cards, dynamic chips, stream meta.

## Phase 2 — Smart ✅

Emotion trajectory, seasonal context, tone vector, voice input, admin analytics/conversations/prompts.

**Migration:** `0052_mr_brownie_phase2.sql`

## Phase 3 — Agent ✅

| Feature | Status |
|---------|--------|
| Mrs. Cookie restricted to owner/admin | ✅ `requireMrsCookieAccess`, nav + launcher + page guard |
| Storefront = Mr. Brownie only | ✅ `storefront-persona.ts`, persona toggle removed |
| Proactive suggestion chips | ✅ `proactive-suggestions.ts` |
| Gift occasion engine | ✅ `gift-occasion.ts` |
| FAQ knowledge retrieval (RAG-lite) | ✅ `knowledge-retrieval.ts` |
| Escalation / WhatsApp handoff | ✅ `escalation.ts` on crisis |
| Support mode overlay on Mr. Brownie | ✅ crisis + support personality |

## Phase 4 — Control & Learning ✅

| Feature | Status |
|---------|--------|
| A/B prompt testing for Mr. Brownie (variant A/B) | ✅ deterministic per-visitor assignment + variant editor |
| Variant performance analytics (quality + sentiment) | ✅ `prompt_variants` in analytics dashboard |
| Conversation funnel (turns → intent → sentiment → weak) | ✅ `funnel` in analytics dashboard |
| Mrs. Cookie DB-backed prompt overlay (admin copilot) | ✅ `copilot-prompt-config.ts`, editor on `/admin/copilot` (owner/admin only) |

**Migration:** `0053_mr_brownie_phase4.sql`
(adds `variant` to `mr_brownie_persona_prompts`, `prompt_variant` to `mr_brownie_turn_logs`, new `mr_brownie_copilot_prompt` overlay table).

### How A/B works
- Each visitor is hashed (clerk/db/user id → FNV-1a) into a stable variant `a` or `b` (`lib/mr-brownie/prompt-variant.ts`).
- The storefront persona instruction resolves the published prompt for that variant, falling back to variant `a`, then the hardcoded default.
- Each turn logs its `prompt_variant`; the admin dashboard compares avg quality + sentiment per variant.

## Phase 5 — Knowledge & Funnels ✅

| Feature | Status |
|---------|--------|
| pgvector RAG (FAQ + policies) | ✅ `0054_mr_brownie_pgvector_rag.sql`, hybrid retrieval |
| Auto-index on first chat (empty table) | ✅ `ensureKnowledgeIndexed()` |
| Admin reindex API + button | ✅ `POST /api/admin/mr-brownie/knowledge/reindex` |
| GA4 chat funnel (open → message → product click → feedback) | ✅ `lib/analytics/mr-brownie-funnel.ts` |

**Migration:** `0054_mr_brownie_pgvector_rag.sql` (requires `vector` extension + `GEMINI_API_KEY` for embeddings).

### RAG flow
1. FAQ/policies embedded via Gemini `text-embedding-004` (768-dim).
2. User query embedded → `match_mr_brownie_knowledge` RPC (cosine similarity).
3. If vector returns 0 hits → keyword fallback (`knowledge-retrieval.ts`).

### GA4 funnel events (`mr_brownie_funnel`)
`chat_open` → `chat_message` / `chip_click` → `assistant_reply` → `product_card_click` → `feedback_up`/`feedback_down`

## Phase 6 — Self-Learning Lite ✅

| Feature | Status |
|---------|--------|
| Product catalog in pgvector RAG | ✅ indexed with FAQ/policies on reindex |
| RAG observability (`rag_source`, `rag_hit_count` in turn logs) | ✅ per-turn logging |
| Knowledge gap detection (zero-hit queries) | ✅ `mr_brownie_knowledge_gaps` table |
| RAG hit rate + gaps in admin analytics | ✅ dashboard section |
| Cross-session gift-box continuity chips | ✅ `proactive-suggestions.ts` |

**Migration:** `0055_mr_brownie_self_learning.sql`

## Phase 7 — Commerce & Ops ✅

| Feature | Status |
|---------|--------|
| Add-to-cart + apply promo from chat (client actions) | ✅ `chat-client-actions.ts`, strip in chat UI |
| Promo intent + server preview | ✅ `commerce-tools.ts`, `promo_help` intent |
| Proactive selling (PDP dwell, cart idle, free-ship nudge) | ✅ `proactive-selling.ts` + ambient API |
| Weekly mining report (admin + cron + script) | ✅ `weekly-report.ts`, `npm run mr-brownie:weekly-report` |

**Cron:** `POST /api/cron/mr-brownie-weekly-report` (weekly, `x-internal-secret`)

### Still optional (external SaaS)
- Mixpanel/PostHog dedicated dashboards (GA4 covers basic funnel today)
- Autonomous knowledge self-patching (human review still required)
- TTS voice replies, native mobile embed

## Key paths

- Storefront: `components/mr-brownie/mr-brownie-chat.tsx`
- Admin Mrs. Cookie: `components/admin/copilot/`, `app/api/admin/copilot/chat`
- Storefront AI admin: `/admin/mr-brownie`
