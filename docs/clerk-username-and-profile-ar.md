# Clerk — بدون username يدوي + ملف العميل

## إخفاء خطوة Username في Clerk

1. Clerk Dashboard → **User & authentication** → **Username**
2. اجعل Username **Optional** أو **Off** (لا يطلب من المستخدم اختياره)
3. الموقع يولّد username تلقائياً عبر:
   - `POST /api/account/provision` بعد الدخول
   - Webhook `user.created` → `provisionClerkUsername` (بدون كلمة مرور مؤقتة لمسجّلي Google/OAuth)
   - إزالة كلمات المرور المؤقتة القديمة: `npm run auth:strip-oauth-passwords` أو `POST /api/admin/auth/strip-oauth-passwords` (owner)

## بعد التسجيل / الدخول

- التسجيل يوجّه إلى `/account/complete-profile`
- العميل يملأ: اسم EN/AR، هاتف، عنوان + خريطة GPS
- بعد الحفظ → `/account`

## قاعدة البيانات

شغّل: `npm run supabase:migrate` (ملف `0027_user_profile_and_address_geo.sql`)
