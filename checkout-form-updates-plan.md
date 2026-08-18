# خطة تحديثات نموذج الدفع (Checkout Form Updates)

## ملخص التغييرات المطلوبة

### 1. الحقول المطلوبة (Required Fields)
- **جميع الحقول تصبح مطلوبة** (required) باستثناء:
  - ✅ **Email** - سيصبح مطلوب
  - ✅ **Delivery Notes** - يبقى اختياري (حاليه بالفعل)
  - ✅ **Governorate** - سيصبح مطلوب

### 2. إعادة ترتيب الحقلين (Reordering)
- **Governorate يأتي أولاً** قبل Area/City
- **Area/City يأتي ثانياً** بعد Governorate

### 3. تحويل إلى قوائم منسدلة (Dropdowns)

#### A. Governorate Dropdown
- قائمة منسدلة تحتوي على **جميع محافظات مصر** (27 محافظة)
- البيانات:
  ```
  - القاهرة (Cairo)
  - الجيزة (Giza)
  - الإسكندرية (Alexandria)
  - الدقهلية (Dakahlia)
  - الشرقية (Sharqia)
  - المنوفية (Menofia)
  - القليوبية (Qalyubia)
  - الغربية (Gharbia)
  - البحيرة (Beheira)
  - بورسعيد (Port Said)
  - دمياط (Damietta)
  - الإسماعيلية (Ismailia)
  - السويس (Suez)
  - كفر الشيخ (Kafr El Sheikh)
  - الفيوم (Fayoum)
  - بني سويف (Beni Suef)
  - المنيا (Minya)
  - أسيوط (Assiut)
  - سوهاج (Sohag)
  - قنا (Qena)
  - الأقصر (Luxor)
  - أسوان (Aswan)
  - الأقصر (Luxor)
  - البحر الأحمر (Red Sea)
  - الوادي الجديد (New Valley)
  - مطروح (Matrouh)
  - شمال سيناء (North Sinai)
  - جنوب سيناء (South Sinai)
  ```

#### B. Area/City Dropdown
- قائمة منسدلة **تعتمد على المحافظة المختارة**
- عند اختيار محافظة، يتم عرض المناطق/المدن الخاصة بها فقط
- مثال:
  - إذا اختار "القاهرة" → تظهر: مدينة نصر، المعادي، وسط البلد، شبرا، المهندسين، إلخ
  - إذا اختار "الإسكندرية" → تظهر: سموحة، ميامي، سيدى جابر، ميناء الإسكندرية، إلخ

## التغييرات الفنية

### 1. إضافة بيانات المحافظات والمدن
- إنشاء ملف/ثابت جديد يحتوي على:
  - `EGYPT_GOVERNORATES` - مصفوفة أسماء المحافظات
  - `EGYPT_CITIES_BY_GOVERNORATE` - كائن حيث المفتاح = المحافظة، القيمة = مصفوفة المدن

### 2. تحديث `formData` state
- الحفاظ على الهيكل الحالي
- إضافة منطق لإعادة تعيين `area` عند تغيير `governorate`

### 3. تحديث واجهة المستخدم (UI)
- استبدال `<input>` بـ `<select>` لـ:
  - Governorate (قبل Area/City)
  - Area/City (بعد Governorate)
- إضافة `required` إلى جميع الحقول المطلوبة

### 4. تحديث منطق التحقق (Validation)
- إضافة تحقق لـ `governorate` (مطلوب)
- إضافة تحقق لـ `email` (مطلوب)
- الحفاظ على تحقق `area` (مطلوب)

### 5. تحديث API الـ Delivery Fee
- التأكد من أن الـ API الحالي `/api/shipping/fee` يعمل مع المحافظات المختارة من القائمة

## ترتيب التنفيذ

1. ✅ إنشاء ملف البيانات (المحافظات والمدن)
2. ✅ إنشاء نظام مطابقة Nominatim ↔ القوائم القياسية
3. ✅ تحديث الـ component لإضافة بيانات المحافظات
4. ✅ تغيير ترتيب الحقول (Governorate قبل Area/City)
5. ✅ تحويل الحقول إلى `<select>` مع الـ logic المناسب
6. ✅ تحديث `handleAddressHint` لاستخدام نظام المطابقة
7. ✅ إضافة `required` إلى الحقول المطلوبة
8. ✅ تحديث منطق التحقق
9. ✅ اختبار التدفق الكامل (يدوي + GPS + WiFi)

## ملاحظات مهمة

- الـ Email حالياً اختياري، سيصبح مطلوب
- Governorate حالياً اختياري، سيصبح مطلوب
- Area/City سيظل مطلوب (كما هو حالياً)
- Delivery Notes يبقى اختياري (كما هو حالياً)
- عند تغيير المحافظة، يجب إعادة تعيين الـ Area/City إلى قيمة فارغة

## 🔴 نقطة مهمة جداً: مطابقة GPS/WiFi مع القوائم

### المشكلة:
- `AddressMapPicker` يستخدم Nominatim API (OpenStreetMap) للحصول على:
  - `city`: المدينة/المنطقة
  - `governorate`: المحافظة (من `addr.state` أو `addr.region`)
- أسماء Nominatim قد لا تطابق أسماء قوائمي العربية بالضبط

### الحل المقترح:
1. **إنشاء نظام مطابقة (Mapping):**
   - ملف يحتوي على `NOMINATIM_TO_STANDARD` - كائن يربط أسماء Nominatim بأسماء قوائمي
   - مثال:
     ```js
     {
       "Cairo": "القاهرة",
       "Giza": "الجيزة",
       "Alexandria": "الإسكندرية",
       "Cairo Governorate": "القاهرة",
       "Al Qahirah": "القاهرة",
       // ... المزيد
     }
     ```

2. **عند استلام بيانات من GPS/WiFi:**
   - في `handleAddressHint`:
     - مطابقة `hint.governorate` مع القائمة القياسية
     - مطابقة `hint.city` مع القائمة القياسية
     - إذا وُجد تطابق → اختيار القيمة تلقائياً في الـ dropdown
     - إذا لم يُوجد تطابق → ترك الحقل فارغ وإظهار رسالة للمستخدم "يرجى اختيار المحافظة والمنطقة من القائمة"

3. **تحديث `handleAddressHint`:**
   ```typescript
   const handleAddressHint = (hint: AddressMapHint) => {
     setAddressHint(hint);
     setFormData((prev) => ({
       ...prev,
       address: hint.street || prev.address,
       // مطابقة المحافظة
       governorate: hint.governorate ? matchGovernorate(hint.governorate) : prev.governorate,
       // مطابقة المدينة
       area: hint.city ? matchCity(hint.city, hint.governorate) : prev.area,
     }));
   };
   ```

4. **دوال المطابقة:**
   - `matchGovernorate(nominatimName): string | null` - ترجع الاسم القياسي أو null
   - `matchCity(nominatimCityName, governorate): string | null` - ترجع الاسم القياسي أو null

5. **تحسين UX:**
   - إذا لم يُجد تطابق، إظهار رسالة وديّة:
     - "تم تحديد الموقع تلقائياً، يرجى تأكيد المحافظة والمنطقة من القائمة"
   - إضافة خيار "أخرى" في القوائم للمحافظات/المدن غير الموجودة
