# تحقق ملكية cookie-bite.com — Google OAuth Branding

رسالة Google الشائعة:

> The website of your home page URL "https://cookie-bite.com/" is not registered to you.  
> Verify ownership of your home page

معناها: **حساب Google Cloud** الذي يدير OAuth **لم يُثبت** أنه يملك `https://cookie-bite.com/` في **Google Search Console** (أو طريقة تحقق أخرى مقبولة).

---

## قبل البدء (مهم)

1. استخدم **نفس حساب Google** (نفس البريد) في:
   - [Google Cloud Console](https://console.cloud.google.com/) — مشروع OAuth
   - [Google Search Console](https://search.google.com/search-console)
2. في **OAuth consent screen** → Branding تأكد من:
   - **Application home page:** `https://cookie-bite.com/` (بشرطة مائلة في النهاية كما يطلب Google)
   - **Application privacy policy:** `https://cookie-bite.com/privacy`
   - **Authorized domains:** `cookie-bite.com` فقط (بدون `https://`)
3. لا تضع `accounts.dev` أو `clerk.com` كصفحة رئيسية — يجب أن تكون موقعك أنت.

---

## الطريقة الموصى بها — وسم HTML (مدمج في الموقع)

الموقع يقرأ المتغير `GOOGLE_SITE_VERIFICATION` ويضيف وسم التحقق تلقائياً في `<head>` (`app/layout.tsx`).

### 1) Search Console

1. افتح [Search Console](https://search.google.com/search-console) **بحساب مالك المشروع**.
2. **Add property** → اختر أحد الخيارين:
   - **Domain:** `cookie-bite.com` (يغطي كل النطاق — يحتاج DNS TXT)، أو
   - **URL prefix:** `https://cookie-bite.com` (أسهل مع وسم HTML).
3. اختر طريقة التحقق: **HTML tag**.
4. انسخ **قيمة `content` فقط** من الوسم، مثلاً إذا كان:
   ```html
   <meta name="google-site-verification" content="AbCdEf123456" />
   ```
   انسخ: `AbCdEf123456` (بدون علامات اقتباس إضافية).

### 2) Hostinger

1. hPanel → **Node.js** → Environment variables.
2. أضف:
   ```env
   GOOGLE_SITE_VERIFICATION=AbCdEf123456
   ```
   (القيمة من خطوة Search Console).
3. **Redeploy** الموقع.
4. تحقق يدوياً: افتح `https://cookie-bite.com` → View source → ابحث عن `google-site-verification`.

### 3) إكمال التحقق

1. في Search Console اضغط **Verify**.
2. بعد النجاح، ارجع إلى **Google Cloud** → **APIs & Services** → **OAuth consent screen** → **Branding**.
3. أعد إرسال **Branding verification** (أو انتظر إعادة المراجعة التلقائية).

---

## بدائل إذا فشل وسم HTML

### DNS (مناسب لخاصية Domain في Search Console)

1. Search Console → Domain → **DNS record** verification.
2. أضف سجل **TXT** عند مسجّل النطاق (Hostinger → DNS):
   - Host: `@` أو كما يعرض Google
   - Value: السلسلة التي يعطيك إياها Google
3. انتظر 5–60 دقيقة ثم Verify.

### ملف HTML في الجذر

1. Search Console يعطيك ملفاً مثل `google1234567890abcdef.html`.
2. ضع الملف في مجلد `public/` في المشروع (يصبح `https://cookie-bite.com/google....html`).
3. انشر الموقع ثم Verify.

### Google Analytics (إن كان مفعّلاً بنفس الحساب)

إذا `NEXT_PUBLIC_GA_ID` مربوط بنفس حساب Google وله صلاحية على الموقع، يمكن اختيار **Google Analytics** كطريقة تحقق في Search Console.

---

## أسباب رفض Branding بعد التحقق

| السبب | الحل |
|--------|------|
| حساب Cloud ≠ حساب Search Console | سجّل الدخول بنفس البريد أو أضف المستخدم كـ Owner في كلا اللوحتين |
| لم يُعمل Redeploy بعد إضافة `GOOGLE_SITE_VERIFICATION` | Redeploy ثم Verify في Search Console |
| الصفحة الرئيسية لا تعرض محتوى عام | تأكد أن `/` يفتح للزائر بدون تسجيل دخول إجباري |
| Privacy Policy على نطاق آخر | استخدم `https://cookie-bite.com/privacy` |
| النطاق مسجّل لدى Google Workspace لمستخدم آخر | Owner النطاق يتحقق أو ينقل الملكية |

---

## Clerk + Google (تذكير)

تحقق Branding في **Google Cloud** مستقل عن Clerk. بعد نجاح التحقق:

- في Clerk → **SSO connections** → Google: استخدم **Custom credentials** من نفس مشروع Google Cloud.
- **Authorized redirect URIs** في Google Cloud يجب أن تتضمن عناوين Clerk للإنتاج والتطوير كما في لوحة Clerk.

---

## مرجع في الكود

- `GOOGLE_SITE_VERIFICATION` → `app/layout.tsx` → `metadata.verification.google`
- قالب المتغير: `.env.example`
