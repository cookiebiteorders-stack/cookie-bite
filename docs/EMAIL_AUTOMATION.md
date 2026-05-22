# Email Automation & Delivery System

نظام بريد مؤسسي متكامل لـ Cookie Bite: طابور، إعادة محاولة، تعدد مزودين، مراقبة، وإصلاح ذاتي.

## البنية

```
lib/email/automation/
  pipeline.ts          # نقطة الإرسال الموحدة
  provider-registry.ts # أولوية + fallback
  providers/           # resend, smtp, sendgrid, mailgun, ses
  bull-queue.ts        # BullMQ (Redis)
  health-monitor.ts    # فحص المزود + DNS
  self-heal.ts         # إعادة طابور + تبديل مزود
  db.ts                # سجلات Supabase

app/api/admin/email/*  # لوحة الإدارة
app/api/cron/email-worker
app/api/cron/email-health

Python: POST /email/validate, GET /email/validate-dns
```

## الجداول (migration 0031)

- `email_queue` — رسائل معلّقة
- `email_logs` — سجل التسليم
- `failed_emails` — فاشلة + إعادة محاولة
- `smtp_configs` — SMTP مشفّر
- `email_templates` — قوالب DB (اختياري؛ القوالب الحالية في `lib/notification-library`)
- `provider_health_logs` — فحوصات دورية
- `email_provider_settings` — مزود نشط + أولوية

## المتغيرات (.env)

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
EMAIL_AUTOMATION_ENABLED=true
EMAIL_USE_QUEUE=true
EMAIL_USE_DB_QUEUE=true
REDIS_URL=redis://127.0.0.1:6379
EMAIL_PROVIDER_PRIORITY=resend,smtp,sendgrid,mailgun
EMAIL_HEALTH_TEST_TO=you@example.com
EMAIL_CONFIG_ENCRYPTION_KEY=<openssl rand -hex 32>

# SMTP fallback
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Optional providers
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_FROM_EMAIL=
```

## Cron (Hostinger)

كل 5 دقائق:

```bash
curl -X POST "https://YOUR_DOMAIN/api/cron/email-worker?limit=25" \
  -H "x-internal-secret: $INTERNAL_API_SECRET"

curl -X POST "https://YOUR_DOMAIN/api/cron/email-health" \
  -H "x-internal-secret: $INTERNAL_API_SECRET"
```

## لوحة الإدارة

- `/admin/email` — Dashboard + اختبار
- `/admin/email/logs`
- `/admin/email/failed`
- `/admin/email/queue`
- `/admin/email/settings`
- القوالب: `/admin/template-library`

## API

| Method | Path |
|--------|------|
| GET | `/api/admin/email/dashboard` |
| GET | `/api/admin/email/logs` |
| GET | `/api/admin/email/failed` |
| POST | `/api/admin/email/failed` `{ id }` retry |
| GET | `/api/admin/email/queue` |
| GET/PATCH | `/api/admin/email/settings` |
| POST | `/api/admin/email/test` `{ to, runHealth? }` |

## Fallback

1. يقرأ `email_provider_settings.provider_priority`
2. يجرّب كل مزود مضبوط بالترتيب
3. عند فشل المزود الأساسي في health cron → `active_provider` يتحول تلقائياً

## التكامل

`lib/email/send.ts` يمر عبر `sendAutomatedEmail` عندما `EMAIL_AUTOMATION_ENABLED !== "false"`.

OTP / حرج: مرّر `immediate: true` في `dispatch` لاحقاً عند الحاجة.

## Resend Contacts API

Service: `lib/email/resend-contacts.ts` — mirrors [Resend Contacts](https://resend.com/docs/api-reference/contacts/create-contact).

| Admin API | Resend |
|-----------|--------|
| `GET/POST /api/admin/email/contacts` | list / create |
| `GET/PATCH/DELETE /api/admin/email/contacts/[id or email]` | get / update / remove |

**Auto-sync:** `POST /api/newsletter`, unsubscribe, and CRM newsletter import push to Resend when `RESEND_API_KEY` is set.

```ts
import { createResendContact, getResendContact, updateResendContact, removeResendContact, listResendContacts } from "@/lib/email/resend-contacts";
```

## Python

```bash
npm run python:up
```

- `POST /email/validate` — MX + تلميح spam
- `GET /email/validate-dns?domain=cookie-bite.com` — SPF/DKIM/DMARC

## النشر

1. `npm run supabase:migrate`
2. ضبط Redis (اختياري لكن موصى به)
3. جدولة cron أعلاه
4. `npm run email:check` للتشخيص السريع (Resend)
