# Cookie Bite — Tracking System

Full first-party analytics built into the Cookie Bite Next.js app.

This document maps the original `full_website_tracking_system` blueprint onto
the actual files that ship with this repo. The 10-phase roadmap is implemented
end-to-end: SDK → `/api/track` → PostgreSQL → ingestion → dashboard → realtime
→ funnels → heatmaps → session replay → AI insights.

---

## 1. Architecture

```
Visitor (browser)
  ↓ Tracking SDK (lib/tracking-sdk)
  ↓ batched POST /api/track  (sendBeacon on unload)
  ↓ Validation (zod) → Rate limit (Redis/in-memory)
  ↓ Ingest pipeline (lib/tracking-server/ingest.ts)
  ├─ tracking_visitors  (upsert)
  ├─ tracking_sessions  (upsert)
  ├─ tracking_events    (insert)
  ├─ tracking_page_views, tracking_click_events, tracking_scroll_events
  ├─ tracking_heatmaps  (50×50 bucket roll-up)
  └─ Redis ZSET: realtime active users (5 min TTL)
        ↓
Admin dashboard (/admin/analytics)
  ├─ Overview KPIs + timeline
  ├─ Realtime (polls /api/realtime)
  ├─ Funnels (tracking_funnels JSON definitions)
  ├─ Heatmaps (tracking_heatmaps)
  ├─ Sessions list + detail (event timeline)
  ├─ Recordings (replay_chunk frames → SVG player)
  └─ AI insights (Gemini → OpenAI → rules fallback)
```

The system never blocks page rendering — events flow through a buffered queue
that batches up to 20 events or 5 seconds, whichever comes first, and falls
back to `navigator.sendBeacon` on `pagehide`/`visibilitychange:hidden`.

---

## 2. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Already used elsewhere in the app. |
| `SUPABASE_SERVICE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side ingestion uses the service role. |
| `REDIS_URL` | optional | Enables Redis-based rate limiting + realtime ZSET. Falls back to PostgreSQL + in-memory map when missing. |
| `TRACKING_TOKEN` | optional | If set, requests must send `x-tracking-token: <value>` and the SDK must be configured with `token`. |
| `NEXT_PUBLIC_TRACKING_TOKEN` | optional | Exposes the same token to the client. |
| `NEXT_PUBLIC_DISABLE_TRACKING` | optional | Set to `1` to disable the SDK at runtime (preview deploys, staff). |
| `GEMINI_API_KEY` | optional | Used first for `/api/analytics/insights`. |
| `OPENAI_API_KEY` | optional | Fallback for `/api/analytics/insights`. |

---

## 3. SDK API

```ts
import { getTracker } from "@/lib/tracking-sdk";

const tracker = getTracker({ userId: clerkUserId });
tracker.track("add_to_cart", { product_id: "p_123", price: 250, currency: "EGP" });

// React helper
import { useTracker } from "@/hooks/useTracker";
const track = useTracker();
track("begin_checkout", { items: 3 });
```

The provider is wired into `app/layout.tsx` via `<TrackerBootstrap />`. It
auto-emits:

* `session_start` on first event of a new session
* `page_view` on every App Router navigation (provider listens to `usePathname`)
* `click` for every click; rage-clicks fire `rage_click` when ≥ 3 clicks land
  within 1 second and 40px of each other
* `scroll` at 25/50/75/90/100% depth buckets
* `form_submit` and `form_field_focus`
* `heartbeat` every 20 seconds while the tab is visible
* `time_on_page` every 15 seconds and on every page change (final = true)

Bot user-agents are detected client- and server-side and excluded from realtime
counts (but still stored in `tracking_events` with `is_bot=true` for audit).

---

## 4. HTTP endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/track` | Public ingestion endpoint. Accepts a `TrackBatchPayload`. |
| `OPTIONS` | `/api/track` | CORS preflight. |
| `GET` | `/api/realtime` | Admin-only. Active visitors in the last 5 minutes. |
| `GET` | `/api/analytics/overview?range=24h\|7d\|30d\|90d` | KPIs + timeline + pages + devices + referrers. |
| `GET` | `/api/analytics/sessions?limit=50` | Recent sessions. |
| `GET` | `/api/analytics/sessions/[id]` | Single session + event timeline. |
| `GET` | `/api/analytics/funnels` | List funnels. |
| `GET` | `/api/analytics/funnels/[slug]?range=` | Compute one funnel. |
| `GET` | `/api/analytics/heatmap?path=&device=` | Heatmap cells for a (path, device). |
| `GET` | `/api/analytics/recordings` | Sessions that have replay frames. |
| `GET` | `/api/analytics/recordings/[session]` | Replay frames for one session. |
| `GET` | `/api/analytics/insights?range=` | LLM-generated insights. |

All `/api/analytics/*` endpoints and `/api/realtime` go through
`requireAdminAccess("analytics")`, so only `owner`/`admin`/`staff` accounts
with analytics access can read them.

---

## 5. Database

A single migration adds 12 tables — see
`supabase/migrations/0033_tracking_system.sql`. All tables enable RLS without
public policies; writes are performed exclusively from the server-side
service-role client.

Recommended retention:

* `tracking_events` — 90–180 days
* `tracking_page_views`/`tracking_click_events`/`tracking_scroll_events` — 90 days
* `tracking_recordings` (when enabled) — 30 days
* `tracking_heatmaps` — keep indefinitely (already aggregated)

You can add the retention job inside an existing BullMQ cron.

---

## 6. Funnels

Funnels are defined in the `tracking_funnels` table as ordered JSON arrays of
steps. Each step matches an event name and (optionally) a path and a subset of
properties. The default funnel installed by the migration is:

```
home → view_item → add_to_cart → begin_checkout → purchase
```

To add a new funnel:

```sql
INSERT INTO public.tracking_funnels (slug, name, description, steps) VALUES (
  'newsletter',
  'Newsletter signup',
  'Visitors who reach the newsletter form and submit it.',
  '[
    {"name": "Visit blog", "event": "page_view", "match": {"path": "/blog"}},
    {"name": "Open form",  "event": "form_field_focus", "match": {"properties": {"selector": "#newsletter"}}},
    {"name": "Submit",     "event": "form_submit",       "match": {"properties": {"selector": "#newsletter"}}}
  ]'::jsonb
);
```

It will show up in `/admin/analytics/funnels` automatically.

---

## 7. Privacy & compliance

* No persistent fingerprint hashes leave the user's device unless they also
  produce a normal pageview (the fingerprint is a low-entropy djb2 hash).
* IP addresses are stored only in `tracking_sessions.ip` and
  `tracking_events.ip`. They can be redacted by setting `geo.ip` to `null` in
  `lib/tracking-server/geo.ts` if your jurisdiction requires it.
* Inputs of type `password`, `email`, `tel`, credit-card or with `password`,
  `card`, `cvv` in the `name` are excluded from click/form snapshots by the
  SDK (`lib/tracking-sdk/dom.ts`).
* The whole tracker can be disabled at runtime by setting
  `NEXT_PUBLIC_DISABLE_TRACKING=1` or by adding a cookie-consent gate that
  passes `disabled` to `TrackerProvider`.

---

## 8. Production checklist

- [ ] Apply migration `0033_tracking_system.sql` (or run `npm run supabase:migrate`).
- [ ] Set `TRACKING_TOKEN` (and `NEXT_PUBLIC_TRACKING_TOKEN`) for spoof protection.
- [ ] Verify `REDIS_URL` is reachable so realtime + rate-limiting use Redis.
- [ ] Confirm `/admin/analytics` opens and KPIs load.
- [ ] Send a few test events from production and confirm they reach the DB.
- [ ] Add a cookie-consent gate (set `disabled` until consent is given).
- [ ] Schedule a retention job to delete rows older than your retention window.
