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
npm run python:setup       # يربط .env الرئيسي → cookie-bite-python/.env
npm run python:up          # docker compose
npm run python:health      # GET /health
npm run python:retrain     # إعادة تدريب التوصيات
npm run supabase:migrate   # يطبّق 0023_user_events
npm run security:audit     # فحص أمني للمشروع كاملاً
```

## تفعيل على الموقع (Production)

Hostinger يشغّل **Next.js فقط**. Python يحتاج **سيرفر منفصل** (VPS أو Railway/Render):

1. `npm run python:setup` محلياً — يضبط `INTERNAL_API_SECRET` و`PYTHON_API_URL`
2. انشر `cookie-bite-python/` عبر Docker على VPS:
   ```bash
   cd cookie-bite-python && docker compose up -d --build
   ```
3. في **hPanel → Environment variables** (Node.js):
   ```env
   PYTHON_API_URL=https://python-api.cookie-bite.com
   INTERNAL_API_SECRET=<نفس القيمة في Python .env>
   ```
4. **Redeploy** Next.js
5. تحقق: `curl https://python-api.cookie-bite.com/health`
6. جدولة إعادة التدريب (cron أسبوعي): `POST /recommendations/retrain` + header `x-internal-secret`

بدون `PYTHON_API_URL` الموقع يعمل بـ fallback (آخر منتجات من Supabase).
