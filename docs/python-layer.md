# Python layer — alignment with the blueprint

مرجع المخطط: `CookieBite_Python_Blueprint.docx` (9 مراحل / 26 أسبوعاً).

## ما بُني في المستودع

| Blueprint | الحالة | الموقع |
|-----------|--------|--------|
| Phase 1 — Docker + core | ✅ | `cookie-bite-python/` |
| Phase 1 — health / ready | ✅ | `GET /health`, `GET /ready` |
| Phase 2 — auth + rate limit | 🟡 جزئي | Clerk JWKS + `INTERNAL_API_SECRET`, SlowAPI wired |
| Phase 3 — `user_events` | ✅ | `0023_user_events.sql`, `/api/events`, Python `POST /events` |
| Phase 3 — recommendations ML | ✅ | Python `/recommendations/*`, تتبع PDP + سلة + شراء |
| Phase 3 — PDP tracking | ✅ | `PdpViewTracker`, `trackProductEvent`, `PurchaseEventsTracker` |
| Phase 4 — Mr. Brownie Python | ⏸️ | موجود في Next (Gemini) |
| Phase 5 — Celery automation | ⏸️ | BullMQ في Next |
| Phase 7 — WhatsApp Cloud | ⏸️ | Bridge في `services/whatsapp-bridge` |

## قرارات معمارية (مختلفة عن المخطط)

1. **Clerk** بدل Supabase Auth JWT فقط — Python يتحقق من `CLERK_JWKS_URL`.
2. **BullMQ** في Next للإشعارات — لا Celery مكرر حتى الحاجة لـ ML ثقيل.
3. **Gemini** لـ Mr. Brownie في Next — لا Anthropic في Python حالياً.
4. **Proxy** عبر `PYTHON_API_URL` + rewrite `/api/python/*`.

## أوامر مفيدة

```bash
npm run python:up          # docker compose
npm run supabase:migrate   # يطبّق 0023_user_events
npm run security:audit     # فحص أمني للمشروع كاملاً
```
