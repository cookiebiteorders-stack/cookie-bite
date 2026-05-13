# Release checklist — Cookie Bite

استخدم هذه القائمة قبل كل إطلاق إنتاجي.

## قاعدة البيانات والترحيلات

- [ ] تشغيل ترحيلات SQL الجديدة على مشروع Supabase (`0013_checkout_idempotency.sql`, `0014_chat_messages_rls.sql`).
- [ ] التحقق من سياسات RLS على الجداول الحساسة (`orders`, `chat_messages`, `payments`, …).
- [ ] نسخ احتياطي أو خطة rollback للترحيل الحرجة.

## البيئة والأسرار

- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` في بيئة الإنتاج.
- [ ] مفاتيح Paymob (`PAYMOB_HMAC_SECRET`, مفاتيح API) ومعلومات الويبهوك HTTPS.
- [ ] Clerk (مصادقة الإنتاج) ونطاقات مسموحة.
- [ ] البريد / الإشعارات (`OWNER_BOOTSTRAP_EMAIL`, إعدادات الرسائل إن وُجدت).

## البناء والاختبارات

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run test` (مع `--coverage` عند التحقق من العتبات)
- [ ] `npm run build`
- [ ] اختبارات دخان يدوية: إضافة للسلة → checkout → طلب → (دفع تجريبي إن أمكن).

## المراقبة بعد الإطلاق

- [ ] مراجعة سجلات أخطاء Vercel/الخادم وسجلات Supabase لأول ساعة.
- [ ] التحقق من webhook Paymob يعيد `200` وليس تكرار غير متوقع.

## الأمان

- [ ] تأكيد أن `middleware.ts` مفعّل (إعادة تصدير من `proxy.ts`) وحدود المعدل (`rate limit`) مناسبة للحمل.
- [ ] استخدام `Idempotency-Key` أو `idempotency_key` في طلبات إنشاء الطلب من الواجهة عند إعادة المحاولة.
