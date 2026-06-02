# 🍪 دليل تنفيذ الميزات — Mr. Brownie / Cookie Bite
> خطة تنفيذ شاملة لكل ميزة: قاعدة بيانات، API، UI/UX، وprompts جاهزة للتطوير

---

## جدول المحتويات

1. [جدولة التوصيل + هدية لمستلم آخر](#1-جدولة-التوصيل)
2. [إعادة طلب صندوق الهدايا بنقرة واحدة](#2-إعادة-طلب-صندوق-الهدايا)
3. [ربط الإضافات من صفحة المنتج في الأدمن](#3-ربط-الإضافات-من-المنتج)
4. [تنبيه "نفد المخزون" + "أخبرني عند التوفر"](#4-تنبيه-نفد-المخزون)
5. [استرداد السلة المهجورة](#5-استرداد-السلة-المهجورة)
6. [رابط مشاركة صندوق الهدايا](#6-رابط-مشاركة-صندوق-الهدايا)
7. [صفحة "كشف الهدية" للمستلم](#7-صفحة-كشف-الهدية)
8. [صندوق المفاجأة (Mystery Box)](#8-صندوق-المفاجأة)
9. [قوالب المناسبات الجاهزة](#9-قوالب-المناسبات)
10. [لوحة ولاء واضحة في الحساب](#10-لوحة-الولاء)
11. [مكافآت مضاعفة على صناديق الهدايا](#11-مكافآت-مضاعفة)
12. [برنامج إحالة مرئي](#12-برنامج-الإحالة)
13. [لوحة تنفيذ طلبات صناديق الهدايا (أدمن)](#13-لوحة-تنفيذ-الطلبات)
14. [تنبيهات واتساب/بريد للطلبات العاجلة](#14-تنبيهات-الطلبات-العاجلة)
15. [تقارير أداء الإضافات والصناديق](#15-تقارير-الأداء)
16. [Mrs. Cookie في الواجهة العامة](#16-mrs-cookie)
17. [طلبات B2B متعددة العناوين](#17-طلبات-b2b)
18. [كتالوج B2B بأسعار خاصة](#18-كتالوج-b2b)

---

## 1. جدولة التوصيل

### 📋 وصف الميزة
إضافة حقول في الـ checkout: تاريخ ووقت التوصيل، عنوان المستلم، خيار إخفاء السعر، واختيار "من مرسل سري".

---

### 🗃️ قاعدة البيانات (Supabase)

```sql
-- إضافة حقول جديدة لجدول الطلبات
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_delivery_time TIME;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS hide_price BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS anonymous_sender BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_message TEXT;

-- جدول خانات الوقت المتاحة
CREATE TABLE IF NOT EXISTS delivery_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,              -- "صباحاً 9-12"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_orders_per_slot INT DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  available_days INT[] DEFAULT '{1,2,3,4,5,6,0}',  -- أيام الأسبوع
  created_at TIMESTAMPTZ DEFAULT now()
);

-- تتبع حجوزات الخانات
CREATE TABLE IF NOT EXISTS slot_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID REFERENCES delivery_time_slots(id),
  order_id UUID REFERENCES orders(id),
  delivery_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إدراج خانات افتراضية
INSERT INTO delivery_time_slots (label, start_time, end_time) VALUES
  ('صباحاً 9:00 - 12:00', '09:00', '12:00'),
  ('ظهراً 12:00 - 3:00', '12:00', '15:00'),
  ('عصراً 3:00 - 6:00', '15:00', '18:00'),
  ('مساءً 6:00 - 9:00', '18:00', '21:00');
```

---

### 📡 API Endpoints

```typescript
// app/api/delivery-slots/route.ts
// GET /api/delivery-slots?date=2025-01-15
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  
  const dayOfWeek = new Date(date!).getDay()
  
  const { data: slots } = await supabase
    .from('delivery_time_slots')
    .select(`
      *,
      slot_bookings(count)
    `)
    .eq('is_active', true)
    .contains('available_days', [dayOfWeek])
  
  // فلتر الخانات المتاحة
  const available = slots?.map(slot => ({
    ...slot,
    available: slot.max_orders_per_slot - (slot.slot_bookings?.[0]?.count || 0),
    isFull: (slot.slot_bookings?.[0]?.count || 0) >= slot.max_orders_per_slot
  }))
  
  return Response.json({ slots: available })
}
```

```typescript
// app/api/orders/schedule/route.ts
// POST /api/orders/schedule
export async function POST(request: Request) {
  const body = await request.json()
  /*
  body: {
    orderId: string
    deliveryDate: string       // "2025-01-15"
    slotId: string
    recipientName: string
    recipientPhone: string
    recipientAddress: {
      street: string
      district: string
      city: string
    }
    hidePrice: boolean
    anonymousSender: boolean
    senderName?: string
    giftMessage?: string
  }
  */
  
  // تحقق من توفر الخانة
  const { count } = await supabase
    .from('slot_bookings')
    .select('*', { count: 'exact' })
    .eq('slot_id', body.slotId)
    .eq('delivery_date', body.deliveryDate)
  
  const { data: slot } = await supabase
    .from('delivery_time_slots')
    .select('max_orders_per_slot')
    .eq('id', body.slotId)
    .single()
  
  if (count! >= slot!.max_orders_per_slot) {
    return Response.json({ error: 'الخانة ممتلئة' }, { status: 400 })
  }
  
  // احجز الخانة وحدّث الطلب
  await Promise.all([
    supabase.from('slot_bookings').insert({
      slot_id: body.slotId,
      order_id: body.orderId,
      delivery_date: body.deliveryDate
    }),
    supabase.from('orders').update({
      scheduled_delivery_date: body.deliveryDate,
      scheduled_delivery_time: slot?.start_time,
      recipient_name: body.recipientName,
      recipient_phone: body.recipientPhone,
      recipient_address: body.recipientAddress,
      hide_price: body.hidePrice,
      anonymous_sender: body.anonymousSender,
      sender_name: body.senderName,
      gift_message: body.giftMessage
    }).eq('id', body.orderId)
  ])
  
  return Response.json({ success: true })
}
```

---

### 🎨 UI/UX — مكوّن جدولة التوصيل

**الموقع:** صفحة `/checkout` بعد قسم العنوان، قبل الدفع  
**النمط البصري:** بطاقات ناعمة، ألوان العلامة (بني دافئ + كريمي)، أيقونات Lucide

```tsx
// components/checkout/DeliveryScheduler.tsx
'use client'
import { useState } from 'react'
import { Calendar, Clock, User, EyeOff, Gift } from 'lucide-react'

interface TimeSlot {
  id: string
  label: string
  available: number
  isFull: boolean
}

export function DeliveryScheduler() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isGift, setIsGift] = useState(false)
  const [hidePrice, setHidePrice] = useState(false)
  const [anonymousSender, setAnonymousSender] = useState(false)

  const today = new Date()
  const maxDate = new Date()
  maxDate.setDate(today.getDate() + 30)

  const fetchSlots = async (date: string) => {
    const res = await fetch(`/api/delivery-slots?date=${date}`)
    const data = await res.json()
    setSlots(data.slots)
    setSelectedSlot('')
  }

  return (
    <section className="bg-[#FDF8F3] rounded-2xl p-6 border border-[#E8D5BE] space-y-6">
      <h3 className="font-bold text-[#3D2B1F] text-lg flex items-center gap-2">
        <Calendar size={20} className="text-[#C4843C]" />
        جدولة التوصيل
      </h3>

      {/* اختيار التاريخ */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-[#6B4C3B]">تاريخ التوصيل</label>
        <input
          type="date"
          min={today.toISOString().split('T')[0]}
          max={maxDate.toISOString().split('T')[0]}
          value={selectedDate}
          onChange={e => { setSelectedDate(e.target.value); fetchSlots(e.target.value) }}
          className="w-full border border-[#DCC5A8] rounded-xl px-4 py-3 text-[#3D2B1F] 
                     bg-white focus:outline-none focus:ring-2 focus:ring-[#C4843C]/30"
        />
      </div>

      {/* خانات الوقت */}
      {selectedDate && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#6B4C3B]">
            <Clock size={14} className="inline ml-1" />
            خانة الوقت
          </label>
          <div className="grid grid-cols-2 gap-3">
            {slots.map(slot => (
              <button
                key={slot.id}
                disabled={slot.isFull}
                onClick={() => setSelectedSlot(slot.id)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all
                  ${slot.isFull
                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                    : selectedSlot === slot.id
                      ? 'border-[#C4843C] bg-[#C4843C]/10 text-[#C4843C]'
                      : 'border-[#DCC5A8] bg-white text-[#3D2B1F] hover:border-[#C4843C]/50'
                  }`}
              >
                <div>{slot.label}</div>
                {!slot.isFull && (
                  <div className="text-xs text-[#9B7355] mt-1">
                    {slot.available} مكان متاح
                  </div>
                )}
                {slot.isFull && <div className="text-xs mt-1">ممتلئة</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* خيار الهدية */}
      <div className="border-t border-[#E8D5BE] pt-4">
        <button
          onClick={() => setIsGift(!isGift)}
          className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all
            ${isGift ? 'bg-[#FFF0DC] border-2 border-[#C4843C]' : 'bg-white border-2 border-[#DCC5A8]'}`}
        >
          <Gift size={18} className={isGift ? 'text-[#C4843C]' : 'text-[#9B7355]'} />
          <span className="font-medium text-[#3D2B1F]">إرسال كهدية لشخص آخر</span>
          <div className={`mr-auto w-5 h-5 rounded-full border-2 flex items-center justify-center
            ${isGift ? 'border-[#C4843C] bg-[#C4843C]' : 'border-[#DCC5A8]'}`}>
            {isGift && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>
        </button>
      </div>

      {/* تفاصيل المستلم */}
      {isGift && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-[#6B4C3B]">اسم المستلم</label>
              <input placeholder="محمد أحمد"
                className="w-full border border-[#DCC5A8] rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-[#6B4C3B]">جوال المستلم</label>
              <input placeholder="05xxxxxxxx" dir="ltr"
                className="w-full border border-[#DCC5A8] rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none" />
            </div>
          </div>

          {/* خيار إخفاء السعر */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={hidePrice}
              onChange={e => setHidePrice(e.target.checked)}
              className="w-4 h-4 accent-[#C4843C]" />
            <div className="flex items-center gap-2 text-sm text-[#3D2B1F]">
              <EyeOff size={14} className="text-[#9B7355]" />
              إخفاء السعر من الطلب
            </div>
          </label>

          {/* خيار المرسل السري */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={anonymousSender}
              onChange={e => setAnonymousSender(e.target.checked)}
              className="w-4 h-4 accent-[#C4843C]" />
            <span className="text-sm text-[#3D2B1F]">إرسال من "مرسل سري"</span>
          </label>

          {!anonymousSender && (
            <div className="space-y-1">
              <label className="text-sm text-[#6B4C3B]">اسم المرسل على البطاقة</label>
              <input placeholder="اسمك"
                className="w-full border border-[#DCC5A8] rounded-xl px-3 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-[#6B4C3B]">رسالة الهدية (اختيارية)</label>
            <textarea rows={3} placeholder="اكتب رسالتك هنا..."
              className="w-full border border-[#DCC5A8] rounded-xl px-3 py-2.5 text-sm bg-white resize-none focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none" />
            <div className="text-xs text-[#9B7355] text-left">0/150</div>
          </div>
        </div>
      )}
    </section>
  )
}
```

---

### 📝 Prompt للـ AI (Cursor/Copilot)

```
أضف مكوّن جدولة التوصيل إلى صفحة الـ checkout في Next.js 14 (App Router).

المتطلبات:
1. بعد قسم عنوان التوصيل وقبل ملخص الطلب
2. جلب خانات الوقت من /api/delivery-slots?date=YYYY-MM-DD
3. إظهار الخانات الممتلئة كـ disabled
4. حفظ التحديد في Zustand store (cartStore أو checkoutStore)
5. عند تأكيد الطلب: POST /api/orders/schedule مع orderId
6. عند تفعيل "إرسال كهدية": إظهار حقول المستلم بأنيميشن ناعم
7. استخدام نفس نظام الألوان: #C4843C، #3D2B1F، #FDF8F3
8. Tailwind فقط، لا مكتبات CSS إضافية
9. دعم RTL كامل
10. التحقق من الحقول قبل الانتقال للدفع
```

---

---

## 2. إعادة طلب صندوق الهدايا

### 📋 وصف الميزة
زر "أعد نفس الصندوق" في `/account/orders` يعيد ملء السلة بنفس التكوين السابق.

---

### 🗃️ قاعدة البيانات

```sql
-- الجدول الحالي يكفي — نحتاج فقط استرجاع giftBox snapshot
-- تأكد أن orders.gift_box_snapshot يُحفظ عند إنشاء الطلب

ALTER TABLE orders ADD COLUMN IF NOT EXISTS gift_box_snapshot JSONB;
-- يُحفظ تلقائياً عند إنشاء الطلب إذا كان order_type = 'gift_box'
```

**مثال على `gift_box_snapshot`:**
```json
{
  "boxSize": "large",
  "boxColor": "chocolate",
  "items": [
    { "productId": "uuid-1", "name": "Brownie Classic", "quantity": 3, "price": 45 },
    { "productId": "uuid-2", "name": "Cookie Butter", "quantity": 2, "price": 35 }
  ],
  "addons": [
    { "addonId": "uuid-a", "name": "شمعة عيد ميلاد", "price": 15 }
  ],
  "giftMessage": "كل عام وأنت بخير",
  "totalItems": 5,
  "totalPrice": 150
}
```

---

### 📡 API

```typescript
// app/api/orders/[orderId]/reorder/route.ts
export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  const { userId } = await getAuthUser(request)
  
  // التحقق من ملكية الطلب
  const { data: order } = await supabase
    .from('orders')
    .select('gift_box_snapshot, user_id, order_type')
    .eq('id', params.orderId)
    .single()
  
  if (order?.user_id !== userId) {
    return Response.json({ error: 'غير مصرح' }, { status: 403 })
  }
  
  if (order?.order_type !== 'gift_box' || !order?.gift_box_snapshot) {
    return Response.json({ error: 'هذا الطلب ليس صندوق هدايا' }, { status: 400 })
  }
  
  // تحقق من توفر المنتجات
  const snapshot = order.gift_box_snapshot
  const productIds = snapshot.items.map((i: any) => i.productId)
  
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity, is_active')
    .in('id', productIds)
  
  const unavailable = products?.filter(p => !p.is_active || p.stock_quantity === 0)
  
  return Response.json({
    snapshot,
    unavailableItems: unavailable?.map(p => p.name) || [],
    canReorder: (unavailable?.length || 0) === 0
  })
}
```

---

### 🎨 UI/UX — زر إعادة الطلب

```tsx
// components/account/OrderCard.tsx — إضافة للبطاقة الحالية
'use client'
import { useState } from 'react'
import { RotateCcw, AlertCircle, CheckCircle } from 'lucide-react'
import { useCartStore } from '@/lib/cart/store'
import { useRouter } from 'next/navigation'

export function ReorderButton({ orderId, orderType }: {
  orderId: string
  orderType: string
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'confirm' | 'unavailable'>('idle')
  const [snapshot, setSnapshot] = useState<any>(null)
  const [unavailable, setUnavailable] = useState<string[]>([])
  const { restoreGiftBox } = useCartStore()
  const router = useRouter()

  if (orderType !== 'gift_box') return null

  const handleReorder = async () => {
    setState('loading')
    const res = await fetch(`/api/orders/${orderId}/reorder`, { method: 'POST' })
    const data = await res.json()
    
    if (data.unavailableItems?.length > 0) {
      setUnavailable(data.unavailableItems)
      setState('unavailable')
    } else {
      setSnapshot(data.snapshot)
      setState('confirm')
    }
  }

  const confirmReorder = () => {
    restoreGiftBox(snapshot)
    router.push('/gift-box/build')
  }

  return (
    <div>
      {state === 'idle' && (
        <button
          onClick={handleReorder}
          className="flex items-center gap-2 text-sm font-medium text-[#C4843C] 
                     hover:text-[#A36830] transition-colors px-3 py-2 rounded-lg 
                     hover:bg-[#FFF0DC]"
        >
          <RotateCcw size={15} />
          أعد نفس الصندوق
        </button>
      )}

      {state === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-[#9B7355] px-3 py-2">
          <div className="w-4 h-4 border-2 border-[#C4843C]/30 border-t-[#C4843C] 
                          rounded-full animate-spin" />
          جاري التحضير...
        </div>
      )}

      {state === 'confirm' && snapshot && (
        <div className="bg-[#FFF0DC] border border-[#C4843C]/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#3D2B1F] font-medium">
            <CheckCircle size={16} className="text-[#C4843C]" />
            سيتم إضافة {snapshot.totalItems} قطعة للسلة
          </div>
          <div className="text-sm text-[#6B4C3B]">
            {snapshot.items.map((item: any) => (
              <span key={item.productId} className="ml-2">
                {item.name} ×{item.quantity}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={confirmReorder}
              className="flex-1 bg-[#C4843C] text-white rounded-lg py-2 text-sm font-medium
                         hover:bg-[#A36830] transition-colors">
              تأكيد وانتقل للبناء
            </button>
            <button onClick={() => setState('idle')}
              className="px-3 py-2 text-sm text-[#9B7355] hover:text-[#6B4C3B]">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {state === 'unavailable' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
            <AlertCircle size={15} />
            بعض المنتجات غير متوفرة
          </div>
          <div className="text-xs text-amber-700">
            {unavailable.join('، ')}
          </div>
          <button onClick={() => { setSnapshot(null); setState('idle') }}
            className="text-xs text-[#C4843C] underline">
            ابنِ صندوقاً جديداً
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### 📝 Prompt للـ AI

```
في ملف lib/cart/store.ts (Zustand)، أضف action جديدة:

restoreGiftBox(snapshot: GiftBoxSnapshot): void

تقوم بـ:
1. مسح السلة الحالية
2. إعادة ضبط giftBox من snapshot
3. تعيين boxSize وboxColor من snapshot
4. إضافة كل item من snapshot.items
5. إضافة كل addon من snapshot.addons
6. حفظ giftMessage

النوع GiftBoxSnapshot:
{
  boxSize: 'small' | 'medium' | 'large'
  boxColor: string
  items: Array<{ productId: string, name: string, quantity: number, price: number }>
  addons: Array<{ addonId: string, name: string, price: number }>
  giftMessage: string
}

بعد الانتهاء، أضف ReorderButton في بطاقة الطلب في /account/orders — 
تظهر فقط إذا كان order.order_type === 'gift_box'
```

---

---

## 3. ربط الإضافات من صفحة المنتج

### 📋 وصف الميزة
إضافة قسم "إضافات مرتبطة" في نموذج تعديل/إنشاء المنتج بالأدمن، بحيث لا يضطر الأدمن للذهاب لـ `/admin/addons` في كل مرة.

---

### 🗃️ قاعدة البيانات

```sql
-- جدول العلاقة (قد يكون موجوداً، نتأكد من البنية)
CREATE TABLE IF NOT EXISTS product_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES addons(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, addon_id)
);

-- إنشاء index للأداء
CREATE INDEX IF NOT EXISTS idx_product_addons_product ON product_addons(product_id);
CREATE INDEX IF NOT EXISTS idx_product_addons_addon ON product_addons(addon_id);
```

---

### 📡 API

```typescript
// app/api/admin/products/[productId]/addons/route.ts

// GET — جلب الإضافات المرتبطة بالمنتج
export async function GET(req: Request, { params }: { params: { productId: string } }) {
  const { data } = await supabase
    .from('product_addons')
    .select(`
      addon_id, is_required, sort_order,
      addons (id, name, name_ar, price, image_url, is_active)
    `)
    .eq('product_id', params.productId)
    .order('sort_order')
  
  return Response.json({ addons: data })
}

// PUT — تحديث قائمة الإضافات كاملة (replace all)
export async function PUT(req: Request, { params }: { params: { productId: string } }) {
  const { addons }: { addons: Array<{ addonId: string, isRequired: boolean, sortOrder: number }> }
    = await req.json()
  
  // احذف الحالية وأضف الجديدة
  await supabase.from('product_addons').delete().eq('product_id', params.productId)
  
  if (addons.length > 0) {
    await supabase.from('product_addons').insert(
      addons.map(a => ({
        product_id: params.productId,
        addon_id: a.addonId,
        is_required: a.isRequired,
        sort_order: a.sortOrder
      }))
    )
  }
  
  return Response.json({ success: true })
}

// app/api/admin/addons/search/route.ts
// GET /api/admin/addons/search?q=شمعة
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') || ''
  
  const { data } = await supabase
    .from('addons')
    .select('id, name, name_ar, price, image_url')
    .eq('is_active', true)
    .or(`name.ilike.%${q}%,name_ar.ilike.%${q}%`)
    .limit(10)
  
  return Response.json({ addons: data })
}
```

---

### 🎨 UI/UX — قسم الإضافات في الأدمن

```tsx
// components/admin/products/ProductAddonsSection.tsx
'use client'
import { useState, useEffect } from 'react'
import { Search, Plus, X, GripVertical, AlertCircle } from 'lucide-react'

interface Addon {
  id: string
  name: string
  name_ar: string
  price: number
  image_url?: string
}

interface LinkedAddon extends Addon {
  isRequired: boolean
  sortOrder: number
}

export function ProductAddonsSection({ productId }: { productId: string }) {
  const [linked, setLinked] = useState<LinkedAddon[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Addon[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [saved, setSaved] = useState(false)

  // جلب الإضافات الحالية
  useEffect(() => {
    if (!productId) return
    fetch(`/api/admin/products/${productId}/addons`)
      .then(r => r.json())
      .then(d => setLinked(d.addons?.map((a: any) => ({
        ...a.addons, isRequired: a.is_required, sortOrder: a.sort_order
      })) || []))
  }, [productId])

  // بحث الإضافات
  useEffect(() => {
    if (searchQuery.length < 1) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const res = await fetch(`/api/admin/addons/search?q=${searchQuery}`)
      const data = await res.json()
      setSearchResults(data.addons?.filter((a: Addon) =>
        !linked.find(l => l.id === a.id)
      ) || [])
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, linked])

  const addAddon = (addon: Addon) => {
    setLinked(prev => [...prev, { ...addon, isRequired: false, sortOrder: prev.length }])
    setSearchQuery('')
    setSearchResults([])
  }

  const removeAddon = (id: string) => {
    setLinked(prev => prev.filter(a => a.id !== id))
  }

  const toggleRequired = (id: string) => {
    setLinked(prev => prev.map(a =>
      a.id === id ? { ...a, isRequired: !a.isRequired } : a
    ))
  }

  const handleSave = async () => {
    await fetch(`/api/admin/products/${productId}/addons`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addons: linked.map((a, i) => ({
          addonId: a.id, isRequired: a.isRequired, sortOrder: i
        }))
      })
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">الإضافات المرتبطة</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {linked.length} إضافة
        </span>
      </div>

      {/* مربع البحث */}
      <div className="relative">
        <Search size={15} className="absolute right-3 top-3 text-gray-400" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث عن إضافة لربطها..."
          className="w-full border border-gray-200 rounded-lg pl-4 pr-9 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-[#C4843C]/30"
        />
        
        {/* نتائج البحث */}
        {searchResults.length > 0 && (
          <div className="absolute top-full right-0 left-0 z-10 bg-white border border-gray-200 
                          rounded-lg shadow-lg mt-1 divide-y divide-gray-50 max-h-60 overflow-y-auto">
            {searchResults.map(addon => (
              <button key={addon.id} onClick={() => addAddon(addon)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-right">
                {addon.image_url && (
                  <img src={addon.image_url} className="w-8 h-8 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{addon.name_ar}</div>
                  <div className="text-xs text-gray-500">{addon.price} ر.س</div>
                </div>
                <Plus size={14} className="text-[#C4843C]" />
              </button>
            ))}
          </div>
        )}
        {isSearching && (
          <div className="absolute top-full right-0 left-0 z-10 bg-white border border-gray-200
                          rounded-lg shadow-lg mt-1 p-4 text-center text-sm text-gray-500">
            جاري البحث...
          </div>
        )}
      </div>

      {/* الإضافات المرتبطة */}
      {linked.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed 
                        border-gray-200 rounded-xl">
          <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
          لا توجد إضافات مرتبطة — ابحث لإضافة
        </div>
      ) : (
        <div className="space-y-2">
          {linked.map(addon => (
            <div key={addon.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <GripVertical size={14} className="text-gray-300 cursor-grab" />
              {addon.image_url && (
                <img src={addon.image_url} className="w-9 h-9 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{addon.name_ar}</div>
                <div className="text-xs text-gray-500">{addon.price} ر.س</div>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={addon.isRequired}
                  onChange={() => toggleRequired(addon.id)}
                  className="accent-[#C4843C]" />
                إلزامية
              </label>
              <button onClick={() => removeAddon(addon.id)}
                className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSave}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all
          ${saved
            ? 'bg-green-100 text-green-700'
            : 'bg-[#C4843C] text-white hover:bg-[#A36830]'
          }`}>
        {saved ? '✓ تم الحفظ' : 'حفظ الإضافات'}
      </button>
    </div>
  )
}
```

---

### 📝 Prompt للـ AI

```
في صفحة تعديل المنتج /admin/products/[id]/edit:
1. أضف مكوّن ProductAddonsSection بعد قسم "المعلومات الأساسية"
2. يجلب الإضافات الحالية من /api/admin/products/[id]/addons عند التحميل
3. يدعم Drag & Drop لترتيب الإضافات (استخدم @dnd-kit/sortable)
4. عند الحفظ النهائي للمنتج: يُرسل PUT /api/admin/products/[id]/addons بالقائمة المحدّثة
5. لا تكرر حفظ الإضافات — ادمجها مع زر "حفظ المنتج" الرئيسي
```

---

---

## 4. تنبيه "نفد المخزون"

### 📋 وصف الميزة
على صفحة المنتج: زر "أخبرني عند التوفر" عندما يكون المنتج غير متاح، مع إرسال إشعار بريد أو واتساب تلقائي.

---

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS back_in_stock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT,
  notification_channel TEXT DEFAULT 'email' CHECK (notification_channel IN ('email', 'whatsapp', 'both')),
  is_notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, email)
);

CREATE INDEX IF NOT EXISTS idx_back_in_stock_product ON back_in_stock_requests(product_id);

-- Trigger: عند عودة المخزون
CREATE OR REPLACE FUNCTION notify_back_in_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تغيّر stock من 0 إلى > 0
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    -- استدعاء Edge Function للإشعارات
    PERFORM net.http_post(
      url := current_setting('app.edge_function_url') || '/notify-back-in-stock',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('productId', NEW.id, 'productName', NEW.name_ar)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER back_in_stock_trigger
AFTER UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION notify_back_in_stock();
```

---

### 📡 API + Edge Function

```typescript
// app/api/back-in-stock/route.ts
export async function POST(request: Request) {
  const { productId, email, phone, channel } = await request.json()
  
  // تحقق أن المنتج فعلاً غير متوفر
  const { data: product } = await supabase
    .from('products')
    .select('stock_quantity, name_ar')
    .eq('id', productId)
    .single()
  
  if (product && product.stock_quantity > 0) {
    return Response.json({ error: 'المنتج متوفر الآن!' }, { status: 400 })
  }
  
  const { error } = await supabase
    .from('back_in_stock_requests')
    .upsert({
      product_id: productId,
      email,
      phone,
      notification_channel: channel
    }, { onConflict: 'product_id,email' })
  
  if (error) return Response.json({ error: error.message }, { status: 500 })
  
  // تأكيد التسجيل عبر البريد
  await resend.emails.send({
    from: 'Mr. Brownie <hello@mrbrownie.sa>',
    to: email,
    subject: 'سنخبرك عند توفر المنتج! 🍪',
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #3D2B1F;">تم التسجيل بنجاح ✓</h2>
        <p>سنرسل لك إشعاراً فور توفر <strong>${product?.name_ar}</strong>.</p>
        <p style="color: #9B7355; font-size: 14px;">
          يمكنك إلغاء الاشتراك في أي وقت من صفحة حسابك.
        </p>
      </div>
    `
  })
  
  return Response.json({ success: true })
}

// supabase/functions/notify-back-in-stock/index.ts (Edge Function)
Deno.serve(async (req) => {
  const { productId, productName } = await req.json()
  
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  // جلب المشتركين
  const { data: requests } = await supabase
    .from('back_in_stock_requests')
    .select('*')
    .eq('product_id', productId)
    .eq('is_notified', false)
  
  // إرسال البريد
  const emailRequests = requests?.filter(r => 
    r.notification_channel === 'email' || r.notification_channel === 'both'
  )
  
  for (const req of emailRequests || []) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Mr. Brownie <hello@mrbrownie.sa>',
        to: req.email,
        subject: `${productName} متوفر الآن! 🎉`,
        html: `
          <div dir="rtl">
            <h2>البشرى! 🍪</h2>
            <p><strong>${productName}</strong> عاد للمتجر.</p>
            <a href="https://mrbrownie.sa/products/${productId}"
               style="background: #C4843C; color: white; padding: 12px 24px; 
                      border-radius: 8px; text-decoration: none;">
              اطلب الآن
            </a>
          </div>
        `
      })
    })
  }
  
  // علّم كـ مُرسَل
  await supabase
    .from('back_in_stock_requests')
    .update({ is_notified: true, notified_at: new Date().toISOString() })
    .eq('product_id', productId)
  
  return new Response('OK')
})
```

---

### 🎨 UI/UX — زر "أخبرني عند التوفر"

```tsx
// components/product/BackInStockButton.tsx
'use client'
import { useState } from 'react'
import { Bell, Mail, MessageCircle, CheckCircle } from 'lucide-react'

export function BackInStockButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')

  const handleSubmit = async () => {
    if (!email) return
    setStatus('loading')
    
    await fetch('/api/back-in-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, email, phone, channel })
    })
    
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 
                      rounded-2xl p-4">
        <CheckCircle className="text-green-500" size={20} />
        <p className="text-sm text-green-800 font-medium">
          سنخبرك فور توفر المنتج! 🎉
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl
                   border-2 border-[#C4843C]/40 text-[#C4843C] font-medium
                   hover:bg-[#FFF0DC] transition-all"
      >
        <Bell size={18} />
        أخبرني عند التوفر
      </button>

      {open && (
        <div className="bg-[#FDF8F3] border border-[#E8D5BE] rounded-2xl p-4 space-y-4
                        animate-fadeIn">
          {/* اختيار القناة */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'email', label: 'بريد إلكتروني', Icon: Mail },
              { value: 'whatsapp', label: 'واتساب', Icon: MessageCircle }
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setChannel(value as any)}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl
                            border-2 text-sm font-medium transition-all
                            ${channel === value
                              ? 'border-[#C4843C] bg-[#C4843C]/10 text-[#C4843C]'
                              : 'border-[#DCC5A8] text-[#6B4C3B]'}`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {channel === 'email' ? (
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-[#DCC5A8] rounded-xl px-4 py-3 text-sm
                         bg-white focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none"
              dir="ltr"
            />
          ) : (
            <input
              type="tel"
              placeholder="05xxxxxxxx"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-[#DCC5A8] rounded-xl px-4 py-3 text-sm
                         bg-white focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none"
              dir="ltr"
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={status === 'loading' || (!email && !phone)}
            className="w-full bg-[#3D2B1F] text-white rounded-xl py-3 text-sm font-medium
                       hover:bg-[#2A1E15] disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
          >
            {status === 'loading' ? 'جاري التسجيل...' : 'سجّلني'}
          </button>
        </div>
      )}
    </div>
  )
}
```

---

### 📝 Prompt للـ AI

```
في صفحة المنتج (app/products/[slug]/page.tsx):
1. إذا كان product.stock_quantity === 0 أو product.is_active === false:
   - أخفِ زر "أضف للسلة"  
   - أظهر BackInStockButton مكانه
   - أظهر badge "نفد المخزون" باللون الأحمر الفاتح

2. في admin: أضف في /admin/products جدول يعرض عدد المشتركين 
   لكل منتج غير متاح — عمود "ينتظرون التوفر: X"

3. Commands لتفعيل الـ Edge Function:
   supabase functions deploy notify-back-in-stock --no-verify-jwt
   supabase secrets set RESEND_API_KEY=re_xxxx
```

---

---

## 5. استرداد السلة المهجورة

### 📋 وصف الميزة
إرسال بريد أو واتساب بعد 1 و24 ساعة للعملاء الذين أضافوا للسلة ولم يكملوا الشراء، مع رابط يعيد السلة.

---

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  phone TEXT,
  cart_snapshot JSONB NOT NULL,
  recovery_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  reminder_1_sent_at TIMESTAMPTZ,
  reminder_2_sent_at TIMESTAMPTZ,
  recovered_at TIMESTAMPTZ,
  is_recovered BOOLEAN DEFAULT false,
  cart_value DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_token ON abandoned_carts(recovery_token);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_user ON abandoned_carts(user_id);

-- جدول الخصومات المؤقتة للاسترداد
CREATE TABLE IF NOT EXISTS recovery_discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES abandoned_carts(id),
  code TEXT UNIQUE,
  discount_percent INT DEFAULT 10,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '48 hours'),
  is_used BOOLEAN DEFAULT false
);
```

---

### 📡 API + Cron Job

```typescript
// app/api/cart/abandon/route.ts
// يُستدعى من Zustand عند مغادرة الصفحة (beforeunload أو 10 دقائق خمول)
export async function POST(request: Request) {
  const { cartSnapshot, email, phone } = await request.json()
  
  if (!cartSnapshot?.items?.length) return Response.json({ ok: true })
  
  const cartValue = cartSnapshot.items.reduce(
    (sum: number, item: any) => sum + (item.price * item.quantity), 0
  )
  
  // تجنّب التكرار — حدّث إذا موجود
  const { data: existing } = await supabase
    .from('abandoned_carts')
    .select('id')
    .eq('email', email)
    .eq('is_recovered', false)
    .single()
  
  if (existing) {
    await supabase.from('abandoned_carts').update({
      cart_snapshot: cartSnapshot,
      cart_value: cartValue,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id)
  } else {
    await supabase.from('abandoned_carts').insert({
      email, phone, cart_snapshot: cartSnapshot, cart_value: cartValue
    })
  }
  
  return Response.json({ ok: true })
}

// app/api/cart/recover/[token]/route.ts
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const { data: cart } = await supabase
    .from('abandoned_carts')
    .select('*, recovery_discount_codes(*)')
    .eq('recovery_token', params.token)
    .single()
  
  if (!cart) return Response.json({ error: 'Invalid token' }, { status: 404 })
  
  // علّم كـ مسترد
  await supabase.from('abandoned_carts').update({
    is_recovered: true,
    recovered_at: new Date().toISOString()
  }).eq('id', cart.id)
  
  const discountCode = cart.recovery_discount_codes?.[0]
  
  return Response.json({
    cartSnapshot: cart.cart_snapshot,
    discountCode: discountCode?.is_used ? null : discountCode?.code
  })
}

// supabase/functions/send-cart-reminders/index.ts (يُشغَّل كـ Cron كل ساعة)
Deno.serve(async () => {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // الإشعار الأول (بعد ساعة)
  const { data: firstReminders } = await supabase
    .from('abandoned_carts')
    .select('*')
    .eq('is_recovered', false)
    .is('reminder_1_sent_at', null)
    .lt('created_at', oneHourAgo.toISOString())
    .gt('cart_value', 0)
  
  for (const cart of firstReminders || []) {
    await sendRecoveryEmail(cart, 1)
    await supabase.from('abandoned_carts').update({
      reminder_1_sent_at: now.toISOString()
    }).eq('id', cart.id)
  }
  
  // الإشعار الثاني (بعد 24 ساعة + كود خصم)
  const { data: secondReminders } = await supabase
    .from('abandoned_carts')
    .select('*')
    .eq('is_recovered', false)
    .is('reminder_2_sent_at', null)
    .not('reminder_1_sent_at', 'is', null)
    .lt('created_at', twentyFourHoursAgo.toISOString())
  
  for (const cart of secondReminders || []) {
    // أنشئ كود خصم
    const code = `BACK${cart.id.slice(0, 6).toUpperCase()}`
    await supabase.from('recovery_discount_codes').insert({
      cart_id: cart.id, code, discount_percent: 10
    })
    await sendRecoveryEmail(cart, 2, code)
    await supabase.from('abandoned_carts').update({
      reminder_2_sent_at: now.toISOString()
    }).eq('id', cart.id)
  }
  
  return new Response('Done')
})

async function sendRecoveryEmail(cart: any, reminder: number, discountCode?: string) {
  const items = cart.cart_snapshot.items
  const recoveryUrl = `https://mrbrownie.sa/cart/recover/${cart.recovery_token}`
  
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Mr. Brownie <hello@mrbrownie.sa>',
      to: cart.email,
      subject: reminder === 1
        ? 'نسيت شيئاً في سلتك 🍪'
        : `خصم 10% لإتمام طلبك! ⏰`,
      html: generateAbandonedCartEmail({ items, recoveryUrl, discountCode, reminder })
    })
  })
}
```

---

### 🎨 UI/UX — صفحة الاسترداد

```tsx
// app/cart/recover/[token]/page.tsx
export default async function RecoverCartPage({ params }: { params: { token: string } }) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/cart/recover/${params.token}`)
  const { cartSnapshot, discountCode } = await res.json()
  
  return (
    <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
        
        {/* أيقونة */}
        <div className="w-20 h-20 bg-[#FFF0DC] rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🍪</span>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-[#3D2B1F]">سلتك تنتظرك!</h1>
          <p className="text-[#9B7355] mt-2">
            أكملت {cartSnapshot.items.length} منتج بانتظار المراجعة
          </p>
        </div>

        {/* عناصر السلة */}
        <div className="text-right space-y-2 bg-[#FDF8F3] rounded-2xl p-4">
          {cartSnapshot.items.map((item: any) => (
            <div key={item.productId} className="flex justify-between text-sm">
              <span className="text-[#6B4C3B]">{item.name} ×{item.quantity}</span>
              <span className="font-medium text-[#3D2B1F]">{item.price * item.quantity} ر.س</span>
            </div>
          ))}
          <div className="border-t border-[#E8D5BE] pt-2 flex justify-between font-bold text-[#3D2B1F]">
            <span>الإجمالي</span>
            <span>{cartSnapshot.items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)} ر.س</span>
          </div>
        </div>

        {/* كود الخصم */}
        {discountCode && (
          <div className="bg-[#FFF0DC] border-2 border-dashed border-[#C4843C] rounded-2xl p-4">
            <p className="text-sm text-[#6B4C3B] mb-1">كود خصم 10% حصري لك:</p>
            <p className="text-xl font-bold text-[#C4843C] tracking-widest">{discountCode}</p>
            <p className="text-xs text-[#9B7355] mt-1">صالح لمدة 48 ساعة</p>
          </div>
        )}

        <RestoreCartButton cartSnapshot={cartSnapshot} discountCode={discountCode} />
      </div>
    </div>
  )
}
```

---

### ⚙️ Commands

```bash
# نشر Edge Function
supabase functions deploy send-cart-reminders --no-verify-jwt

# جدولة Cron كل ساعة
supabase --project-ref YOUR_REF functions schedule \
  --name send-cart-reminders \
  --schedule "0 * * * *"

# متغيرات البيئة
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set NEXT_PUBLIC_URL=https://mrbrownie.sa
```

---

---

## 6. رابط مشاركة صندوق الهدايا

### 📋 وصف الميزة
إنشاء رابط `mrbrownie.sa/gift-preview/TOKEN` يعرض صندوق الهدايا المُصمَّم قبل أو بعد الشراء، مع مشاركة على واتساب وتويتر وإنستغرام.

---

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS shared_gift_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  user_id UUID REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  box_snapshot JSONB NOT NULL,
  view_count INT DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 📡 API

```typescript
// app/api/gift-box/share/route.ts
export async function POST(request: Request) {
  const { boxSnapshot, orderId } = await request.json()
  const user = await getAuthUser(request)
  
  const { data } = await supabase
    .from('shared_gift_boxes')
    .insert({
      user_id: user?.id,
      order_id: orderId,
      box_snapshot: boxSnapshot
    })
    .select('share_token')
    .single()
  
  // زيادة share_count على الطلب
  if (orderId) {
    await supabase.rpc('increment', { table: 'orders', id: orderId, column: 'share_count' })
  }
  
  return Response.json({
    shareUrl: `https://mrbrownie.sa/gift-preview/${data?.share_token}`,
    token: data?.share_token
  })
}

// app/api/gift-box/share/[token]/route.ts
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const { data, error } = await supabase
    .from('shared_gift_boxes')
    .select('*, orders(recipient_name, gift_message)')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })
  
  // زيادة view_count
  await supabase.rpc('increment_views', { share_id: data.id })
  
  return Response.json(data)
}
```

---

### 🎨 UI/UX — زر المشاركة + صفحة المعاينة

```tsx
// components/gift-box/ShareGiftBox.tsx
'use client'
import { useState } from 'react'
import { Share2, Copy, CheckCheck, MessageCircle, Twitter } from 'lucide-react'

export function ShareGiftBox({ boxSnapshot, orderId }: any) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const generateLink = async () => {
    setLoading(true)
    const res = await fetch('/api/gift-box/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxSnapshot, orderId })
    })
    const { shareUrl: url } = await res.json()
    setShareUrl(url)
    setLoading(false)
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = `شوف صندوق الهدايا اللي صممته 🎁🍪`

  return (
    <div className="space-y-3">
      {!shareUrl ? (
        <button
          onClick={generateLink}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5
                     bg-white border border-[#DCC5A8] rounded-xl text-[#3D2B1F]
                     hover:bg-[#FFF0DC] hover:border-[#C4843C] transition-all"
        >
          <Share2 size={15} />
          {loading ? 'جاري الإنشاء...' : 'شارك الصندوق'}
        </button>
      ) : (
        <div className="bg-[#FDF8F3] border border-[#E8D5BE] rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-[#3D2B1F]">رابط المشاركة جاهز!</p>
          
          {/* الرابط */}
          <div className="flex gap-2">
            <div className="flex-1 bg-white border border-[#DCC5A8] rounded-xl px-3 py-2.5
                            text-xs text-[#6B4C3B] truncate font-mono" dir="ltr">
              {shareUrl}
            </div>
            <button onClick={copyLink}
              className={`px-3 py-2.5 rounded-xl text-sm transition-all
                ${copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-[#C4843C] text-white hover:bg-[#A36830]'
                }`}>
              {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
            </button>
          </div>

          {/* أزرار المشاركة */}
          <div className="flex gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 
                         bg-[#25D366] text-white rounded-xl text-sm font-medium
                         hover:bg-[#1da851] transition-colors"
            >
              <MessageCircle size={15} />
              واتساب
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 py-2.5
                         bg-[#1DA1F2] text-white rounded-xl text-sm font-medium
                         hover:bg-[#0c85d0] transition-colors"
            >
              <Twitter size={15} />
              تويتر
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

---

## 7. صفحة "كشف الهدية"

### 📋 وصف الميزة
بعد اكتمال الطلب، يُرسل للمستلم رابط صفحة تفاعلية يفتح فيها صندوق الهدايا بأنيميشن احتفالي.

---

### 🗃️ قاعدة البيانات

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reveal_token TEXT UNIQUE 
  DEFAULT encode(gen_random_bytes(12), 'hex');
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reveal_viewed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reveal_reaction TEXT;
```

---

### 🎨 UI/UX — صفحة الكشف

```tsx
// app/gift-reveal/[token]/page.tsx — الصفحة الاحتفالية
'use client'
import { useState, useEffect } from 'react'

type RevealState = 'closed' | 'shaking' | 'opening' | 'open'

export default function GiftRevealPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<RevealState>('closed')
  const [order, setOrder] = useState<any>(null)
  const [confetti, setConfetti] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/reveal/${params.token}`)
      .then(r => r.json())
      .then(setOrder)
  }, [params.token])

  const handleOpen = () => {
    setState('shaking')
    setTimeout(() => setState('opening'), 800)
    setTimeout(() => {
      setState('open')
      setConfetti(true)
      // سجّل المشاهدة
      fetch(`/api/orders/reveal/${params.token}`, { method: 'PATCH' })
    }, 1800)
  }

  if (!order) return (
    <div className="min-h-screen bg-[#3D2B1F] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#C4843C]/30 border-t-[#C4843C] 
                      rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3D2B1F] via-[#5C3D2E] to-[#3D2B1F]
                    flex flex-col items-center justify-center p-6">
      {/* كونفيتي */}
      {confetti && <ConfettiEffect />}
      
      {state !== 'open' ? (
        /* صندوق مغلق */
        <div className="text-center space-y-8">
          <p className="text-[#DCC5A8] text-lg">
            لديك هدية من {order.sender_name || 'مرسل سري'} 🎁
          </p>
          
          <div
            onClick={state === 'closed' ? handleOpen : undefined}
            className={`relative w-48 h-48 mx-auto cursor-pointer
              ${state === 'shaking' ? 'animate-shake' : ''}
              ${state === 'opening' ? 'animate-bounce scale-110' : ''}
            `}
          >
            {/* رسمة الصندوق SVG */}
            <GiftBoxSVG isOpen={false} />
          </div>

          {state === 'closed' && (
            <button onClick={handleOpen}
              className="bg-[#C4843C] text-white px-8 py-4 rounded-2xl text-lg font-bold
                         hover:bg-[#A36830] transition-colors shadow-2xl">
              افتح هديتك ✨
            </button>
          )}
        </div>
      ) : (
        /* المحتوى المكشوف */
        <div className="w-full max-w-sm space-y-6 animate-fadeInUp">
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-white">هديتك من {order.sender_name}!</h1>
          </div>

          {/* رسالة الهدية */}
          {order.gift_message && (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20">
              <p className="text-white/60 text-xs mb-2">رسالة شخصية</p>
              <p className="text-white text-lg leading-relaxed">"{order.gift_message}"</p>
            </div>
          )}

          {/* محتوى الصندوق */}
          <div className="bg-white rounded-3xl p-5 space-y-3">
            <p className="font-bold text-[#3D2B1F] text-center mb-4">محتوى صندوقك</p>
            {order.gift_box_snapshot?.items?.map((item: any) => (
              <div key={item.productId} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FDF8F3] rounded-xl flex items-center 
                                justify-center text-2xl">🍪</div>
                <div>
                  <p className="font-medium text-[#3D2B1F]">{item.name}</p>
                  <p className="text-sm text-[#9B7355]">×{item.quantity}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ردود فعل */}
          <ReactionPicker token={params.token} />

          {/* زر الطلب */}
          <a href="/" className="block text-center text-[#DCC5A8] text-sm underline">
            اطلب هديتك الخاصة من Mr. Brownie
          </a>
        </div>
      )}
    </div>
  )
}

// CSS animations إضافية في globals.css:
/*
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  10% { transform: rotate(-5deg); }
  20% { transform: rotate(5deg); }
  30% { transform: rotate(-5deg); }
  40% { transform: rotate(5deg); }
}
.animate-shake { animation: shake 0.8s ease-in-out; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
*/
```

---

---

## 8. صندوق المفاجأة (Mystery Box)

### 📋 وصف الميزة
العميل يختار الميزانية والمناسبة، والنظام يملأ الصندوق تلقائياً بمجموعة مناسبة.

---

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS mystery_box_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occasion TEXT NOT NULL,          -- 'birthday', 'ramadan', 'thanks', 'corporate'
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  product_categories TEXT[],       -- فئات المنتجات المسموح بها
  min_items INT DEFAULT 3,
  max_items INT DEFAULT 8,
  description_ar TEXT,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO mystery_box_rules (occasion, budget_min, budget_max, min_items, max_items, description_ar) VALUES
  ('birthday', 100, 200, 4, 6, 'تشكيلة احتفالية مميزة لعيد الميلاد'),
  ('birthday', 200, 400, 6, 10, 'صندوق فاخر لعيد الميلاد'),
  ('ramadan', 150, 300, 5, 8, 'تشكيلة رمضانية بنكهات خاصة'),
  ('thanks', 80, 150, 3, 5, 'هدية شكر أنيقة'),
  ('corporate', 300, 600, 8, 15, 'صندوق هدايا للشركات');
```

---

### 📡 API

```typescript
// app/api/mystery-box/generate/route.ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const { budget, occasion, preferences } = await request.json()
  
  // جلب قواعد المناسبة
  const { data: rule } = await supabase
    .from('mystery_box_rules')
    .select('*')
    .eq('occasion', occasion)
    .lte('budget_min', budget)
    .gte('budget_max', budget)
    .single()
  
  // جلب المنتجات المتاحة
  const { data: products } = await supabase
    .from('products')
    .select('id, name_ar, price, category, stock_quantity, image_url, description_ar')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .lte('price', budget * 0.4)  // لا يتجاوز منتج واحد 40% من الميزانية
  
  // استخدام Gemini/Claude لاختيار التشكيلة المثلى
  const anthropic = new Anthropic()
  
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `اختر ${rule?.min_items}-${rule?.max_items} منتجات من القائمة التالية لصندوق هدية مناسبة "${occasion}" بميزانية ${budget} ر.س.
      
تفضيلات العميل: ${preferences || 'لا يوجد'}

المنتجات المتاحة:
${products?.map(p => `- ${p.id}: ${p.name_ar} (${p.price} ر.س) - ${p.category}`).join('\n')}

أعد JSON فقط بهذا الشكل:
{
  "selectedItems": [
    { "productId": "uuid", "quantity": 1, "reason": "سبب الاختيار بالعربي" }
  ],
  "totalPrice": 0,
  "boxDescription": "وصف جذاب للصندوق"
}`
    }]
  })
  
  const jsonText = (message.content[0] as any).text
  const selection = JSON.parse(jsonText)
  
  // تحقق من الميزانية
  const selectedProducts = await Promise.all(
    selection.selectedItems.map(async (item: any) => {
      const product = products?.find(p => p.id === item.productId)
      return { ...product, quantity: item.quantity, reason: item.reason }
    })
  )
  
  return Response.json({
    items: selectedProducts,
    totalPrice: selection.totalPrice,
    description: selection.boxDescription,
    occasion,
    budget
  })
}
```

---

### 🎨 UI/UX — صفحة Mystery Box

```tsx
// app/mystery-box/page.tsx
'use client'
import { useState } from 'react'
import { Shuffle, Sparkles, RefreshCw } from 'lucide-react'

const OCCASIONS = [
  { id: 'birthday', label: 'عيد ميلاد', emoji: '🎂' },
  { id: 'ramadan', label: 'رمضان', emoji: '🌙' },
  { id: 'thanks', label: 'شكراً', emoji: '🙏' },
  { id: 'corporate', label: 'هدية شركة', emoji: '🏢' },
  { id: 'wedding', label: 'زواج', emoji: '💍' },
]

const BUDGETS = [100, 150, 200, 300, 400, 500]

export default function MysteryBoxPage() {
  const [occasion, setOccasion] = useState('')
  const [budget, setBudget] = useState(0)
  const [preferences, setPreferences] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/mystery-box/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ occasion, budget, preferences })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FDF8F3]">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🎁</div>
          <h1 className="text-2xl font-bold text-[#3D2B1F]">صندوق المفاجأة</h1>
          <p className="text-[#9B7355]">أخبرنا عن مناسبتك وميزانيتك — نحن نختار!</p>
        </div>

        {/* المناسبة */}
        <div className="space-y-3">
          <label className="font-medium text-[#3D2B1F]">المناسبة</label>
          <div className="grid grid-cols-3 gap-2">
            {OCCASIONS.map(o => (
              <button
                key={o.id}
                onClick={() => setOccasion(o.id)}
                className={`py-3 rounded-2xl border-2 text-center transition-all
                  ${occasion === o.id
                    ? 'border-[#C4843C] bg-[#FFF0DC]'
                    : 'border-[#E8D5BE] bg-white hover:border-[#C4843C]/50'}`}
              >
                <div className="text-2xl">{o.emoji}</div>
                <div className="text-xs font-medium text-[#3D2B1F] mt-1">{o.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* الميزانية */}
        <div className="space-y-3">
          <label className="font-medium text-[#3D2B1F]">الميزانية</label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGETS.map(b => (
              <button
                key={b}
                onClick={() => setBudget(b)}
                className={`py-3 rounded-2xl border-2 text-center font-medium transition-all
                  ${budget === b
                    ? 'border-[#C4843C] bg-[#FFF0DC] text-[#C4843C]'
                    : 'border-[#E8D5BE] bg-white text-[#3D2B1F] hover:border-[#C4843C]/50'}`}
              >
                {b} ر.س
              </button>
            ))}
          </div>
        </div>

        {/* تفضيلات اختيارية */}
        <div className="space-y-2">
          <label className="font-medium text-[#3D2B1F]">تفضيلات خاصة (اختياري)</label>
          <textarea
            value={preferences}
            onChange={e => setPreferences(e.target.value)}
            placeholder="مثال: يحب الشوكولاتة الداكنة، لا يحب المكسرات..."
            rows={2}
            className="w-full border border-[#DCC5A8] rounded-2xl px-4 py-3 text-sm
                       bg-white focus:ring-2 focus:ring-[#C4843C]/30 focus:outline-none resize-none"
          />
        </div>

        {/* زر التوليد */}
        <button
          onClick={generate}
          disabled={!occasion || !budget || loading}
          className="w-full py-4 bg-[#3D2B1F] text-white rounded-2xl font-bold text-lg
                     hover:bg-[#2A1E15] disabled:opacity-50 transition-all flex items-center
                     justify-center gap-3"
        >
          {loading ? (
            <><RefreshCw size={20} className="animate-spin" /> يتم الاختيار...</>
          ) : (
            <><Sparkles size={20} /> اصنع صندوقي</>
          )}
        </button>

        {/* النتيجة */}
        {result && (
          <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#E8D5BE]
                          animate-fadeIn shadow-lg">
            <div className="text-center">
              <p className="font-bold text-[#3D2B1F] text-lg">{result.description}</p>
              <p className="text-[#C4843C] font-bold text-xl mt-1">{result.totalPrice} ر.س</p>
            </div>
            
            <div className="space-y-3">
              {result.items?.map((item: any) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <img src={item.image_url} className="w-14 h-14 rounded-2xl object-cover" />
                  <div className="flex-1">
                    <p className="font-medium text-[#3D2B1F]">{item.name_ar}</p>
                    <p className="text-xs text-[#9B7355]">{item.reason}</p>
                  </div>
                  <span className="text-sm font-bold text-[#3D2B1F]">{item.price} ر.س</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={generate}
                className="flex items-center justify-center gap-2 py-3 border-2 
                           border-[#DCC5A8] rounded-2xl text-[#6B4C3B] hover:border-[#C4843C]"
              >
                <Shuffle size={15} />
                خيار آخر
              </button>
              <button className="py-3 bg-[#C4843C] text-white rounded-2xl font-medium
                                 hover:bg-[#A36830] transition-colors">
                أضف للسلة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

---

## 9. قوالب المناسبات الجاهزة

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS occasion_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  occasion_type TEXT NOT NULL,
  emoji TEXT,
  description_ar TEXT,
  suggested_products JSONB,         -- [{ productId, quantity }]
  suggested_addons JSONB,           -- [addonId]
  suggested_message TEXT,
  cover_image TEXT,
  sort_order INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO occasion_templates 
  (name_ar, occasion_type, emoji, suggested_message, sort_order) VALUES
  ('عيد ميلاد سعيد 🎂', 'birthday', '🎂', 'كل عام وأنت بخير، أتمنى لك يوم مليء بالفرحة والحلوى!', 1),
  ('رمضان كريم 🌙', 'ramadan', '🌙', 'رمضان كريم، تقبّل الله طاعتكم', 2),
  ('شكراً من القلب 🙏', 'thanks', '🙏', 'شكراً على كل شيء، هذه الهدية تعبير بسيط عن امتناني', 3),
  ('مبروك الزواج 💍', 'wedding', '💍', 'بالرفاء والبنين، مبروك على هذا اليوم الجميل', 4),
  ('هدية الشركة 🏢', 'corporate', '🏢', 'بمناسبة تعاوننا المثمر، نتمنى لكم دوام النجاح', 5),
  ('العودة للمدرسة 📚', 'back_to_school', '📚', 'عاماً دراسياً موفقاً، أنت نجم!', 6);
```

---

### 🎨 UI/UX — شريط القوالب في Gift Box Builder

```tsx
// components/gift-box/OccasionTemplates.tsx
'use client'
import { useState } from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'

interface Template {
  id: string
  name_ar: string
  emoji: string
  occasion_type: string
  suggested_message: string
}

export function OccasionTemplates({ onSelect }: { onSelect: (template: Template) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [templates] = useState<Template[]>([
    { id: '1', name_ar: 'عيد ميلاد', emoji: '🎂', occasion_type: 'birthday', suggested_message: 'كل عام وأنت بخير!' },
    { id: '2', name_ar: 'رمضان كريم', emoji: '🌙', occasion_type: 'ramadan', suggested_message: 'رمضان كريم' },
    { id: '3', name_ar: 'شكراً', emoji: '🙏', occasion_type: 'thanks', suggested_message: 'شكراً من القلب' },
    { id: '4', name_ar: 'مبروك الزواج', emoji: '💍', occasion_type: 'wedding', suggested_message: 'بالرفاء والبنين' },
    { id: '5', name_ar: 'هدية شركة', emoji: '🏢', occasion_type: 'corporate', suggested_message: 'مع خالص التقدير' },
  ])

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-[#C4843C]"
      >
        <Sparkles size={15} />
        ابدأ من قالب جاهز
        <ChevronRight
          size={15}
          className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {expanded && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => { onSelect(template); setExpanded(false) }}
              className="flex-shrink-0 w-24 p-3 bg-white border-2 border-[#E8D5BE]
                         rounded-2xl text-center hover:border-[#C4843C] hover:bg-[#FFF0DC]
                         transition-all group"
            >
              <div className="text-3xl mb-1">{template.emoji}</div>
              <div className="text-xs font-medium text-[#3D2B1F] leading-tight">
                {template.name_ar}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

---

## 10. لوحة الولاء

### 🗃️ قاعدة البيانات

```sql
-- جدول مستويات الولاء
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  min_points INT NOT NULL,
  max_points INT,
  points_multiplier DECIMAL(3,2) DEFAULT 1.0,
  perks JSONB,
  color TEXT,
  icon TEXT
);

INSERT INTO loyalty_tiers (name_ar, min_points, max_points, points_multiplier, color) VALUES
  ('برونزي', 0, 999, 1.0, '#CD7F32'),
  ('فضي', 1000, 4999, 1.25, '#C0C0C0'),
  ('ذهبي', 5000, 9999, 1.5, '#FFD700'),
  ('بلاتيني', 10000, NULL, 2.0, '#E5E4E2');

-- جدول استبدال النقاط
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  points_used INT NOT NULL,
  discount_amount DECIMAL(10,2),
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- دالة: احتساب النقاط عند تأكيد الطلب
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  user_tier RECORD;
  points_to_award INT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- جلب مضاعف مستوى المستخدم
    SELECT lt.points_multiplier INTO user_tier
    FROM loyalty_points lp
    JOIN loyalty_tiers lt ON lp.total_points >= lt.min_points
      AND (lt.max_points IS NULL OR lp.total_points <= lt.max_points)
    WHERE lp.user_id = NEW.user_id
    ORDER BY lt.min_points DESC
    LIMIT 1;
    
    -- نقطة لكل ريال
    points_to_award := ROUND(NEW.total_amount * COALESCE(user_tier.points_multiplier, 1));
    
    -- مضاعفة لصناديق الهدايا
    IF NEW.order_type = 'gift_box' THEN
      points_to_award := points_to_award * 2;
    END IF;
    
    UPDATE loyalty_points
    SET points = points + points_to_award,
        total_points = total_points + points_to_award
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 🎨 UI/UX — لوحة الولاء

```tsx
// app/account/loyalty/page.tsx
export default async function LoyaltyPage() {
  const user = await getCurrentUser()
  const loyalty = await getLoyaltyData(user.id)
  
  const tierColors = {
    'برونزي': { bg: '#FDF3E7', text: '#A0522D', border: '#CD7F32' },
    'فضي':   { bg: '#F5F5F5', text: '#696969', border: '#C0C0C0' },
    'ذهبي':  { bg: '#FFFDE7', text: '#B8860B', border: '#FFD700' },
    'بلاتيني': { bg: '#F8F8FF', text: '#696969', border: '#E5E4E2' }
  }
  
  const tier = loyalty.tier
  const colors = tierColors[tier.name_ar as keyof typeof tierColors]
  const nextTierProgress = loyalty.points / tier.max_points * 100

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      
      {/* بطاقة المستوى */}
      <div
        style={{ background: colors.bg, borderColor: colors.border }}
        className="rounded-3xl border-2 p-6 space-y-4"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">مستواك الحالي</p>
            <h2 style={{ color: colors.text }} className="text-2xl font-bold">
              {tier.icon} {tier.name_ar}
            </h2>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-500">رصيد النقاط</p>
            <p className="text-3xl font-bold text-[#3D2B1F]">
              {loyalty.points.toLocaleString('ar')}
            </p>
          </div>
        </div>

        {/* شريط التقدم */}
        {tier.max_points && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{loyalty.points} نقطة</span>
              <span>{tier.max_points} للمستوى التالي</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(nextTierProgress, 100)}%`, background: colors.border }}
                className="h-full rounded-full transition-all duration-1000"
              />
            </div>
            <p className="text-xs text-center text-gray-500">
              {tier.max_points - loyalty.points} نقطة للوصول لـ {loyalty.next_tier}
            </p>
          </div>
        )}
      </div>

      {/* استبدال النقاط */}
      <LoyaltyRedeemSection points={loyalty.points} />

      {/* المزايا */}
      <div className="bg-white rounded-3xl border border-[#E8D5BE] p-5 space-y-3">
        <h3 className="font-bold text-[#3D2B1F]">مزايا مستواك</h3>
        {tier.perks?.map((perk: string, i: number) => (
          <div key={i} className="flex items-center gap-3 text-sm text-[#6B4C3B]">
            <div className="w-5 h-5 rounded-full bg-[#FFF0DC] flex items-center 
                            justify-center text-[#C4843C] text-xs">✓</div>
            {perk}
          </div>
        ))}
      </div>

      {/* سجل النقاط */}
      <LoyaltyHistory userId={user.id} />
    </div>
  )
}
```

---

---

## 11. مكافآت مضاعفة على صناديق الهدايا

### التنفيذ
يُطبَّق عبر Trigger الـ SQL أعلاه (في القسم 10) — عند `order_type = 'gift_box'` يُضاعَف الرصيد.

### إشعار للعميل

```typescript
// في createOrder — بعد اكتمال الطلب
if (order.order_type === 'gift_box') {
  await resend.emails.send({
    to: user.email,
    subject: '🎁 ضاعفنا نقاطك على صندوق الهدايا!',
    html: `
      <div dir="rtl">
        <h2>مبروك! 🎉</h2>
        <p>حصلت على <strong>${pointsAwarded} نقطة مضاعفة</strong> على طلب صندوق الهدايا.</p>
        <p>رصيدك الحالي: <strong>${newTotal} نقطة</strong></p>
        <a href="https://mrbrownie.sa/account/loyalty">عرض رصيدي</a>
      </div>
    `
  })
}
```

---

---

## 12. برنامج الإحالة المرئي

### 🗃️ قاعدة البيانات

```sql
-- تأكد أن referrals table موجود
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_id UUID REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  referrer_reward_points INT DEFAULT 100,
  referred_reward_points INT DEFAULT 50,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- كود إحالة فريد لكل مستخدم
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE
  DEFAULT upper(substr(gen_random_uuid()::text, 1, 8));
```

---

### 🎨 UI/UX — صفحة الإحالة

```tsx
// app/account/referral/page.tsx
export default async function ReferralPage() {
  const user = await getCurrentUser()
  const { referralCode, referrals, totalEarned } = await getReferralData(user.id)
  
  const referralUrl = `https://mrbrownie.sa?ref=${referralCode}`

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      
      {/* Header */}
      <div className="text-center bg-gradient-to-br from-[#3D2B1F] to-[#5C3D2E]
                      rounded-3xl p-8 text-white space-y-2">
        <div className="text-4xl">🎁</div>
        <h1 className="text-xl font-bold">شارك، واحصل على هدايا!</h1>
        <p className="text-white/70 text-sm">
          100 نقطة لك + 50 نقطة لصديقك عند أول طلب
        </p>
      </div>

      {/* كود الإحالة */}
      <div className="bg-[#FDF8F3] border-2 border-dashed border-[#C4843C] 
                      rounded-3xl p-6 text-center space-y-4">
        <p className="text-sm text-[#6B4C3B]">كودك الشخصي</p>
        <p className="text-3xl font-bold text-[#C4843C] tracking-widest">{referralCode}</p>
        <CopyReferralButton url={referralUrl} code={referralCode} />
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'دعوات أُرسلت', value: referrals.total },
          { label: 'أتمّوا طلباً', value: referrals.completed },
          { label: 'نقاط مكسوبة', value: totalEarned }
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[#E8D5BE] rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#3D2B1F]">{stat.value}</p>
            <p className="text-xs text-[#9B7355] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* آلية العمل */}
      <div className="bg-white rounded-3xl border border-[#E8D5BE] p-5 space-y-4">
        <h3 className="font-bold text-[#3D2B1F]">كيف يعمل؟</h3>
        {[
          { step: '١', text: 'شارك كودك مع أصدقائك' },
          { step: '٢', text: 'يسجّل صديقك ويستخدم كودك' },
          { step: '٣', text: 'عند أول طلب: تحصل على 100 نقطة' },
          { step: '٤', text: 'صديقك يحصل على 50 نقطة أيضاً' },
        ].map(item => (
          <div key={item.step} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#C4843C] rounded-full flex items-center 
                            justify-center text-white font-bold text-sm flex-shrink-0">
              {item.step}
            </div>
            <p className="text-sm text-[#3D2B1F]">{item.text}</p>
          </div>
        ))}
      </div>

      {/* سجل الإحالات */}
      {referrals.list?.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E8D5BE] p-5 space-y-3">
          <h3 className="font-bold text-[#3D2B1F]">أصدقاؤك المُحالون</h3>
          {referrals.list.map((ref: any) => (
            <div key={ref.id} className="flex items-center justify-between py-2 
                                         border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FDF8F3] rounded-full flex items-center 
                                justify-center text-sm font-bold text-[#C4843C]">
                  {ref.referred_name?.[0] || '?'}
                </div>
                <span className="text-sm text-[#3D2B1F]">{ref.referred_name || 'مستخدم جديد'}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full
                ${ref.status === 'rewarded'
                  ? 'bg-green-100 text-green-700'
                  : ref.status === 'completed'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'}`}>
                {ref.status === 'rewarded' ? '✓ حصلت على نقاطك'
                  : ref.status === 'completed' ? 'قيد المعالجة'
                  : 'لم يطلب بعد'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

---

## 13. لوحة تنفيذ طلبات صناديق الهدايا (أدمن)

### 🎨 UI/UX — لوحة المطبخ

```tsx
// app/admin/kitchen/page.tsx
export default async function KitchenDashboard() {
  const pendingOrders = await getGiftBoxOrdersForFulfillment()
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">طلبات الصناديق — اليوم</h1>
        <div className="flex gap-3">
          <StatusBadge count={pendingOrders.pending} label="قيد التجهيز" color="amber" />
          <StatusBadge count={pendingOrders.ready} label="جاهزة" color="green" />
          <StatusBadge count={pendingOrders.delivered} label="موصّلة" color="blue" />
        </div>
      </div>

      <div className="grid gap-4">
        {pendingOrders.orders.map((order: any) => (
          <KitchenOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  )
}

function KitchenOrderCard({ order }: { order: any }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800">#{order.order_number}</h3>
          <p className="text-sm text-gray-500">{order.customer_name}</p>
        </div>
        <div className="text-right">
          {order.scheduled_delivery_date && (
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-medium">
              📅 {new Date(order.scheduled_delivery_date).toLocaleDateString('ar-SA')}
            </div>
          )}
          {order.is_gift && (
            <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-medium mt-1">
              🎁 هدية لـ {order.recipient_name}
            </div>
          )}
        </div>
      </div>

      {/* حجم الصندوق ولون */}
      <div className="flex gap-3">
        <div className="bg-[#FDF8F3] px-3 py-2 rounded-xl text-sm">
          <span className="text-gray-500">الحجم: </span>
          <span className="font-medium text-[#3D2B1F]">{order.box_size}</span>
        </div>
        <div className="bg-[#FDF8F3] px-3 py-2 rounded-xl text-sm">
          <span className="text-gray-500">اللون: </span>
          <span className="font-medium text-[#3D2B1F]">{order.box_color}</span>
        </div>
      </div>

      {/* المحتويات */}
      <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
        {order.gift_box_snapshot?.items?.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 px-4 py-3">
            <div className="w-6 h-6 border-2 border-gray-300 rounded cursor-pointer 
                            hover:border-green-500" />
            <span className="flex-1 text-sm font-medium">{item.name}</span>
            <span className="text-sm font-bold text-gray-600">×{item.quantity}</span>
          </div>
        ))}
        
        {/* الإضافات */}
        {order.gift_box_snapshot?.addons?.map((addon: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-purple-50">
            <div className="w-6 h-6 border-2 border-purple-300 rounded cursor-pointer" />
            <span className="flex-1 text-sm font-medium text-purple-800">+ {addon.name}</span>
          </div>
        ))}
      </div>

      {/* رسالة الهدية */}
      {order.gift_message && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-3">
          <p className="text-xs text-pink-500 mb-1">رسالة الهدية (طباعة على البطاقة):</p>
          <p className="text-sm text-pink-900 font-medium">"{order.gift_message}"</p>
        </div>
      )}

      {/* أزرار العمل */}
      <div className="flex gap-2">
        <PrintLabelButton orderId={order.id} />
        <UpdateStatusButton orderId={order.id} currentStatus={order.kitchen_status} />
      </div>
    </div>
  )
}
```

---

### 🖨️ طباعة ملصق المطبخ (PDF)

```typescript
// app/api/admin/orders/[id]/print-label/route.ts
import { jsPDF } from 'jspdf'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const order = await getOrderWithDetails(params.id)
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
  
  // إضافة المحتوى بالعربي
  doc.setR2L(true)
  doc.setFont('Amiri', 'normal')  // تحميل خط عربي
  
  doc.setFontSize(18)
  doc.text(`طلب #${order.order_number}`, 148, 20, { align: 'right' })
  
  doc.setFontSize(12)
  doc.text(`الصندوق: ${order.box_size} - ${order.box_color}`, 148, 35, { align: 'right' })
  
  let y = 50
  order.items.forEach((item: any) => {
    doc.text(`□ ${item.name} × ${item.quantity}`, 148, y, { align: 'right' })
    y += 10
  })
  
  if (order.gift_message) {
    doc.setDrawColor(200, 180, 160)
    doc.rect(10, y + 5, 128, 25)
    doc.text(`البطاقة: ${order.gift_message}`, 140, y + 15, { align: 'right', maxWidth: 120 })
    y += 35
  }
  
  doc.text(`التوصيل: ${order.scheduled_delivery_date || 'في أقرب وقت'}`, 148, y + 10, { align: 'right' })
  
  return new Response(doc.output('arraybuffer'), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=order-${order.order_number}.pdf`
    }
  })
}
```

---

---

## 14. تنبيهات الطلبات العاجلة

### 📡 التنفيذ

```typescript
// lib/notifications/urgent-orders.ts
export async function notifyUrgentOrder(order: Order) {
  const isUrgent = order.scheduled_delivery_date &&
    new Date(order.scheduled_delivery_date).toDateString() === new Date().toDateString()
  
  const isCorporate = order.order_type === 'corporate' || order.cart_value > 500
  
  if (!isUrgent && !isCorporate) return
  
  const message = `
🚨 *طلب ${isCorporate ? 'شركات' : 'عاجل'}*
رقم الطلب: #${order.order_number}
العميل: ${order.customer_name}
القيمة: ${order.total_amount} ر.س
${isUrgent ? `⏰ توصيل اليوم: ${order.scheduled_delivery_time}` : ''}
${isCorporate ? `🏢 طلب شركة` : ''}
الرابط: https://admin.mrbrownie.sa/orders/${order.id}
  `
  
  // واتساب Business API (Twilio)
  await twilioClient.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${process.env.STAFF_WHATSAPP_NUMBER}`
  })
  
  // بريد الفريق
  await resend.emails.send({
    from: 'نظام Mr. Brownie <alerts@mrbrownie.sa>',
    to: process.env.STAFF_EMAIL!,
    subject: `🚨 ${isCorporate ? 'طلب شركة' : 'طلب عاجل'} - #${order.order_number}`,
    html: generateUrgentOrderEmail(order)
  })
}
```

---

---

## 15. تقارير الأداء

### 📡 API

```typescript
// app/api/admin/reports/addons/route.ts
export async function GET(request: Request) {
  const { from, to } = getDateRange(request)
  
  // أداء الإضافات
  const { data: addonStats } = await supabase.rpc('get_addon_performance', {
    date_from: from,
    date_to: to
  })
  
  // أحجام الصناديق
  const { data: boxStats } = await supabase
    .from('orders')
    .select('gift_box_snapshot->boxSize, count(*)')
    .eq('order_type', 'gift_box')
    .gte('created_at', from)
    .lte('created_at', to)
    .group('gift_box_snapshot->boxSize')
  
  // المناسبات الأكثر طلباً
  const { data: occasionStats } = await supabase
    .from('orders')
    .select('occasion_type, count(*), sum(total_amount)')
    .gte('created_at', from)
    .lte('created_at', to)
    .not('occasion_type', 'is', null)
    .group('occasion_type')
    .order('count', { ascending: false })
  
  return Response.json({ addonStats, boxStats, occasionStats })
}

-- SQL Function
CREATE OR REPLACE FUNCTION get_addon_performance(date_from DATE, date_to DATE)
RETURNS TABLE (
  addon_id UUID,
  addon_name TEXT,
  times_selected BIGINT,
  total_revenue DECIMAL,
  avg_order_value DECIMAL
) AS $$
  SELECT 
    a.id,
    a.name_ar,
    COUNT(*) as times_selected,
    SUM(a.price) as total_revenue,
    AVG(o.total_amount) as avg_order_value
  FROM order_addons oa
  JOIN addons a ON oa.addon_id = a.id
  JOIN orders o ON oa.order_id = o.id
  WHERE o.created_at BETWEEN date_from AND date_to
  GROUP BY a.id, a.name_ar
  ORDER BY times_selected DESC
$$ LANGUAGE SQL;
```

---

---

## 16. Mrs. Cookie في الواجهة العامة

### 📡 API

```typescript
// app/api/mrs-cookie/route.ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const { message, context, conversationHistory } = await request.json()
  
  // جلب الكتالوج
  const { data: products } = await supabase
    .from('products')
    .select('id, name_ar, price, category, description_ar, image_url')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .limit(50)
  
  const { data: addons } = await supabase
    .from('addons')
    .select('id, name_ar, price')
    .eq('is_active', true)
  
  const anthropic = new Anthropic()
  
  const systemPrompt = `أنتِ "Mrs. Cookie"، مساعدة Mr. Brownie الودودة والمتخصصة في اقتراح الهدايا.
شخصيتك: دافئة، مبتهجة، خبيرة في الحلويات والمناسبات.
كتالوج المنتجات المتاح:
${products?.map(p => `- ${p.name_ar}: ${p.price} ر.س (${p.category})`).join('\n')}

الإضافات المتاحة:
${addons?.map(a => `- ${a.name_ar}: ${a.price} ر.س`).join('\n')}

عند الاقتراح: اذكري اسم المنتج الكامل كما في الكتالوج.
أجيبي دائماً بالعربية، بأسلوب ودود وموجز.
${context?.productId ? `السياق: العميل ينظر حالياً في صفحة المنتج` : ''}
`
  
  const message_response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: systemPrompt,
    messages: [
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ]
  })
  
  const reply = (message_response.content[0] as any).text
  
  // استخراج المنتجات المذكورة
  const mentionedProducts = products?.filter(p => reply.includes(p.name_ar)) || []
  
  return Response.json({ reply, suggestedProducts: mentionedProducts })
}
```

---

### 🎨 UI/UX — Floating Chat Widget

```tsx
// components/mrs-cookie/MrsCookieWidget.tsx
'use client'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function MrsCookieWidget({ context }: { context?: any }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'مرحباً! أنا Mrs. Cookie 🍪 أساعدك تختار أجمل هدية. ما المناسبة؟'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    
    const res = await fetch('/api/mrs-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        context,
        conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
      })
    })
    
    const data = await res.json()
    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    setSuggestedProducts(data.suggestedProducts || [])
    setLoading(false)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 bg-[#C4843C] text-white 
                    rounded-full shadow-2xl flex items-center justify-center
                    hover:bg-[#A36830] transition-all hover:scale-110
                    ${open ? 'hidden' : 'flex'}`}
      >
        <MessageCircle size={22} />
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                        flex items-center justify-center text-xs font-bold animate-bounce">
          ✨
        </div>
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 left-6 z-50 w-80 sm:w-96 shadow-2xl rounded-3xl 
                        overflow-hidden flex flex-col bg-white"
          style={{ maxHeight: '520px' }}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-[#3D2B1F] to-[#5C3D2E] px-4 py-3
                          flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C4843C] rounded-full flex items-center 
                            justify-center text-lg">🍪</div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Mrs. Cookie</p>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-white/60 text-xs">متاحة الآن</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white p-1">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm
                  ${msg.role === 'user'
                    ? 'bg-[#FDF8F3] text-[#3D2B1F] rounded-br-sm'
                    : 'bg-[#C4843C] text-white rounded-bl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-end">
                <div className="bg-[#C4843C]/20 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-[#C4843C] rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* اقتراحات المنتجات */}
            {suggestedProducts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 text-center">اقتراحاتي لك</p>
                {suggestedProducts.slice(0, 2).map(product => (
                  <a key={product.id} href={`/products/${product.slug}`}
                    className="flex items-center gap-3 p-3 bg-[#FDF8F3] rounded-xl hover:bg-[#FFF0DC]">
                    <img src={product.image_url} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#3D2B1F]">{product.name_ar}</p>
                      <p className="text-xs text-[#C4843C]">{product.price} ر.س</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب سؤالك..."
              className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-sm 
                         focus:outline-none focus:ring-2 focus:ring-[#C4843C]/30"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="w-10 h-10 bg-[#C4843C] rounded-xl flex items-center justify-center
                         text-white hover:bg-[#A36830] disabled:opacity-50">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
```

---

---

## 17. طلبات B2B متعددة العناوين

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS corporate_bulk_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES auth.users(id),
  order_name TEXT,              -- "هدايا رمضان 2025"
  status TEXT DEFAULT 'draft',
  total_recipients INT DEFAULT 0,
  total_amount DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bulk_order_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_order_id UUID REFERENCES corporate_bulk_orders(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  address JSONB,
  gift_box_snapshot JSONB,
  gift_message TEXT,
  individual_order_id UUID REFERENCES orders(id),
  status TEXT DEFAULT 'pending',
  sort_order INT
);
```

---

### 🎨 UI/UX — رفع Excel للمستلمين

```tsx
// app/corporate-gifting/bulk-order/page.tsx
'use client'
import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, Users, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Recipient {
  name: string
  phone: string
  address: string
  district: string
  message?: string
}

export default function BulkOrderPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'review' | 'customize' | 'confirm'>('upload')

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target?.result, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<any>(sheet)
      
      const parsed: Recipient[] = []
      const errs: string[] = []
      
      data.forEach((row, i) => {
        if (!row['الاسم'] || !row['رقم الجوال']) {
          errs.push(`السطر ${i + 2}: يجب توفر الاسم ورقم الجوال`)
          return
        }
        parsed.push({
          name: row['الاسم'],
          phone: row['رقم الجوال'],
          address: row['العنوان'] || '',
          district: row['الحي'] || '',
          message: row['رسالة الهدية']
        })
      })
      
      setRecipients(parsed)
      setErrors(errs)
      if (parsed.length > 0) setStep('review')
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const downloadTemplate = () => {
    const template = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['الاسم', 'رقم الجوال', 'العنوان', 'الحي', 'رسالة الهدية'],
      ['محمد أحمد', '0501234567', 'شارع الملك فهد', 'العليا', 'كل عام وأنت بخير'],
    ])
    XLSX.utils.book_append_sheet(template, ws, 'المستلمون')
    XLSX.writeFile(template, 'نموذج_المستلمين.xlsx')
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-[#3D2B1F]">طلب جماعي للشركات</h1>
        <p className="text-[#9B7355]">أرسل هدايا لعدة أشخاص بضغطة واحدة</p>
      </div>

      {step === 'upload' && (
        <div className="space-y-4">
          {/* تحميل القالب */}
          <button onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-3 py-4 border-2 
                       border-[#C4843C]/40 rounded-2xl text-[#C4843C] hover:bg-[#FFF0DC]">
            <FileSpreadsheet size={20} />
            تحميل نموذج Excel
          </button>

          {/* رفع الملف */}
          <label className="block w-full cursor-pointer">
            <div className="border-2 border-dashed border-[#DCC5A8] rounded-3xl p-10 text-center
                            hover:border-[#C4843C] hover:bg-[#FDF8F3] transition-all">
              <Upload size={40} className="mx-auto text-[#C4843C] mb-3" />
              <p className="font-medium text-[#3D2B1F]">ارفع ملف Excel</p>
              <p className="text-sm text-[#9B7355] mt-1">xlsx, xls — حتى 500 مستلم</p>
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* إدخال يدوي */}
          <div className="text-center">
            <button className="text-sm text-[#C4843C] underline">
              أو أضف مستلمين يدوياً
            </button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 
                          rounded-2xl p-4">
            <CheckCircle className="text-green-500" size={20} />
            <p className="text-green-800">
              تم رفع <strong>{recipients.length} مستلم</strong> بنجاح
            </p>
          </div>

          {errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-medium">
                <AlertCircle size={16} />
                {errors.length} سطر به مشكلة (تم تجاهله)
              </div>
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-amber-700">{err}</p>
              ))}
            </div>
          )}

          {/* معاينة */}
          <div className="bg-white border border-[#E8D5BE] rounded-2xl overflow-hidden">
            <div className="bg-[#FDF8F3] px-4 py-3 flex items-center gap-2">
              <Users size={15} className="text-[#C4843C]" />
              <span className="font-medium text-sm text-[#3D2B1F]">قائمة المستلمين</span>
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {recipients.slice(0, 10).map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="w-6 h-6 bg-[#C4843C]/10 rounded-full flex items-center 
                                  justify-center text-xs font-bold text-[#C4843C]">
                    {i + 1}
                  </div>
                  <span className="flex-1 font-medium text-[#3D2B1F]">{r.name}</span>
                  <span className="text-[#9B7355]" dir="ltr">{r.phone}</span>
                </div>
              ))}
              {recipients.length > 10 && (
                <div className="px-4 py-3 text-xs text-center text-[#9B7355]">
                  و {recipients.length - 10} آخرين...
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setStep('customize')}
            className="w-full py-4 bg-[#C4843C] text-white rounded-2xl font-bold
                       hover:bg-[#A36830] transition-colors">
            التالي: تخصيص الصندوق ←
          </button>
        </div>
      )}
    </div>
  )
}
```

---

---

## 18. كتالوج B2B بأسعار خاصة

### 🗃️ قاعدة البيانات

```sql
CREATE TABLE IF NOT EXISTS company_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  product_id UUID REFERENCES products(id),
  custom_price DECIMAL(10,2),
  discount_percent INT,           -- بديل للسعر الثابت
  min_quantity INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(company_id, product_id)
);

CREATE TABLE IF NOT EXISTS company_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  bulk_order_id UUID REFERENCES corporate_bulk_orders(id),
  invoice_number TEXT UNIQUE DEFAULT 'INV-' || extract(year from now()) || '-' || nextval('invoice_seq'),
  subtotal DECIMAL(10,2),
  vat DECIMAL(10,2),
  total DECIMAL(10,2),
  status TEXT DEFAULT 'unpaid',
  due_date DATE DEFAULT (now() + interval '30 days')::DATE,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;
```

---

## 📦 ملخص الحزم المطلوبة

```bash
# تثبيت جميع الحزم الجديدة
npm install \
  @anthropic-ai/sdk \
  resend \
  twilio \
  jspdf \
  xlsx \
  @dnd-kit/core \
  @dnd-kit/sortable \
  @dnd-kit/utilities \
  canvas-confetti \
  @types/canvas-confetti

# Supabase CLI
npm install -g supabase
```

---

## ⚙️ متغيرات البيئة المطلوبة

```env
# .env.local

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxx

# Resend (البريد الإلكتروني)
RESEND_API_KEY=re_xxxx

# Twilio (واتساب)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
STAFF_WHATSAPP_NUMBER=+966xxxxxxxxx
STAFF_EMAIL=ops@mrbrownie.sa

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx

# App
NEXT_PUBLIC_URL=https://mrbrownie.sa
```

---

## 🗓️ خارطة الطريق النهائية

```
المرحلة 1 (أسبوعان) — تأثير مباشر على المبيعات
├── ✅ جدولة التوصيل + مستلم منفصل       [3-4 أيام]
├── ✅ إعادة طلب صندوق الهدايا           [1-2 يوم]
├── ✅ ربط Addons من المنتج (الأدمن)     [1-2 يوم]
└── ✅ سلة مهجورة (Resend + Cron)        [2-3 أيام]

المرحلة 2 (شهر) — تجربة الهدايا والولاء
├── 🔄 صفحة كشف الهدية (أنيميشن)        [3-4 أيام]
├── 🔄 لوحة الولاء الكاملة               [3-4 أيام]
├── 🔄 Mrs. Cookie على الموقع            [2-3 أيام]
├── 🔄 تنبيه "نفد المخزون"               [1-2 يوم]
└── 🔄 لوحة المطبخ (أدمن)               [2-3 أيام]

المرحلة 3 (2-3 أشهر) — نمو وتوسع
├── 📋 B2B متعددة العناوين               [1 أسبوع]
├── 📋 Mystery Box بـ AI                  [3-4 أيام]
├── 📋 برنامج الإحالة المرئي              [3-4 أيام]
└── 📋 كتالوج B2B + فواتير               [1 أسبوع]
```

---

*آخر تحديث: يونيو 2025 | Mr. Brownie / Cookie Bite Platform*
