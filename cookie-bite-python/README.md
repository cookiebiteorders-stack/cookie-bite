# Cookie Bite — Python microservices

طبقة Python **تكمّل** مشروع Next.js (لا تستبدله). مبنية على [CookieBite_Python_Blueprint](docs/python-layer.md).

## المراحل المُنفَّذة

### Phase 1
- **api-gateway** (FastAPI) على المنفذ `8000`
- **Redis** للتخزين المؤقت
- `GET /health`, `GET /ready`, `POST /events`

### Phase 3 (توصيات)
- `GET /recommendations/trending`
- `GET /recommendations/cart-based?product_ids=...`
- `GET /recommendations/me` (يتطلب Bearer Clerk)
- `POST /recommendations/retrain` (يتطلب `x-internal-secret`)
- تدريب تلقائي عند الإقلاع + collaborative/content hybrid
- مصادقة: `x-internal-secret` (مثل Next.js) أو JWT Clerk عبر `CLERK_JWKS_URL`

## التشغيل المحلي

```bash
cd cookie-bite-python
cp .env.example .env
# املأ DATABASE_URL و INTERNAL_API_SECRET و CLERK_JWKS_URL

docker compose up --build
```

من جذر المشروع:

```bash
npm run python:up
```

تحقق:

```bash
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/ready
```

## الربط مع Next.js

في `.env.local` للمشروع الرئيسي:

```env
PYTHON_API_URL=http://127.0.0.1:8000
```

ثم الطلبات من المتصفح:

- `GET /api/python/health` → يعيد توجيهها إلى Python

تتبع الأحداث (بدون Python):

- `POST /api/events` من الواجهة — يكتب في جدول `user_events`

## الهجرة

```bash
npm run supabase:migrate
# أو تطبيق 0023_user_events.sql يدوياً
```

## الخطوة التالية (Phase 3)

- خدمة `recommendation-engine` على المنفذ 8001
- تدريب SVD ليلي عبر worker
s