type EmailVars = Record<string, string | number | undefined | null>;

type ArEmailCopy = {
  body: string;
  title: string;
  subject: (v: EmailVars) => string;
  preheader: (v: EmailVars) => string;
};

export const AR_EMAIL: Record<string, ArEmailCopy> = {
  welcome: {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag">أهلاً وسهلاً</span>
    <h1>فرحانين بيك، {{first_name}}.</h1>
    <p class="greeting">أهلاً {{first_name}}،</p>
    <p>مرحباً بيك في <strong>كوكي بايت</strong> — مخبز صغير في التجمع الخامس بيحوّل زبدة حقيقية وشوكولاتة فاخرة وصبر كتير لكوكيز متقنة. حسابك جاهز، وهدية ترحيب مستنياك.</p>
    <div class="info-box"><p>🎁 <strong>هدية ترحيب —</strong> استخدم <strong>{{welcome_code}}</strong> وقت الدفع لخصم <strong>{{welcome_discount}}%</strong> على أول بوكس. صالح لمدة {{welcome_validity_days}} يوم.</p></div>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{shop_url}}">شوف نكهات الأسبوع</a></div>
    <hr class="divider">
    <div class="two-col">
      <div class="col-box"><h4>طازة كل يوم</h4><p>معظم البوكسات بتتخبز نفس يوم خروجها من المطبخ.</p></div>
      <div class="col-box"><h4>توصيل مجاني فوق 500 جنيه</h4><p>في التجمع الخامس والمناطق المحيطة.</p></div>
    </div>
    <p style="font-size:13px;color:#9C8B7A;margin-top:18px;">محتاج حاجة؟ رد على الإيميل — حد حقيقي بيقرأ كل رسالة. أو زور <a href="{{help_url}}">مركز المساعدة</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مخبوز بحب في {{company_address}}<br><a href="{{shop_url}}">المتجر</a> · <a href="{{help_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "أهلاً بيك في كوكي بايت",
    subject: (v) => `أهلاً بيك في كوكي بايت، ${v.first_name ?? "يا بطل"}`,
    preheader: (v) =>
      `حسابك جاهز — وهدية ${v.welcome_discount ?? 10}% مستنياك.`,
  },
  "order-confirmed": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag">تم تأكيد الطلب</span>
    <h1>شكراً {{first_name}} — استلمنا طلبك.</h1>
    <p class="greeting">أهلاً {{first_name}}،</p>
    <p>طلبك <strong>#{{order_number}}</strong> اتأكد. هنبدأ نجهّزه أول ما الدفعة تكون جاهزة في المطبخ.</p>
    <table class="order-table">
      <thead><tr><th>المنتج</th><th style="text-align:center;">الكمية</th><th style="text-align:end;">السعر</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">الإجمالي</td><td style="text-align:end;">{{total_amount}}</td></tr>
      </tbody>
    </table>
    <div class="two-col">
      <div class="col-box"><h4>التوصيل إلى</h4><p>{{customer_name}}<br>{{shipping_address}}</p></div>
      <div class="col-box"><h4>الدفع</h4><p>{{payment_method}}<br><strong>{{total_amount}}</strong></p></div>
    </div>
    <div class="info-box"><p>عايز تضيف رسالة هدية مكتوبة بإيد؟ رد خلال ساعة وهنحطها في البوكس — مجاناً.</p></div>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{order_url}}">تابع الطلب</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">أسئلة؟ رد على الإيميل أو كلمنا على واتساب — عادة بنرد خلال ساعة.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مخبوز بحب في {{company_address}}<br><a href="{{order_url}}">طلباتي</a> · <a href="{{privacy_url}}">الخصوصية</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "تم تأكيد الطلب",
    subject: (v) =>
      `طلب #${v.order_number} اتأكد — الكوكيز في الطابور للفرن 🍪`,
    preheader: (v) =>
      `شكراً ${v.first_name ?? ""} — الإجمالي ${v.total_amount}. بدأنا نجهّز دفعتك.`,
  },
  "order-shipped": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag info">في الطريق</span>
    <h1>الكوكيز في الطريق، {{first_name}}.</h1>
    <p class="greeting">أهلاً {{first_name}}،</p>
    <p>طلبك <strong>#{{order_number}}</strong> خرج من المطبخ مع <strong>{{carrier_name}}</strong>. متغلّف بعناية وجاهز يوصل لبابك.</p>
    <div class="tracking-box">
      <p>رقم التتبع</p>
      <div class="tracking-num">{{tracking_number}}</div>
      <p style="color:#5C3A21;font-weight:500;letter-spacing:0;">التوصيل المتوقع · {{estimated_delivery}}</p>
    </div>
    <div style="text-align:center;margin:18px 0;"><a class="cta-btn" href="{{tracking_url}}">تابع الشحنة</a></div>
    <div class="info-box"><p><strong>نصيحة:</strong> لو مش هتاكلهم دلوقتي، حط الكوكيز في علبة مقفولة في درجة حرارة الغرفة — بيفضلوا تمام لحد 7 أيام.</p></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">مش متوقع الطلب؟ <a href="{{contact_url}}">تواصل معانا</a> فوراً — هنحل الموضوع.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مخبوز بحب في {{company_address}}<br><a href="{{tracking_url}}">تتبع</a> · <a href="{{contact_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "طلبك في الطريق",
    subject: (v) => `طلب كوكي بايت #${v.order_number} في الطريق 🚚`,
    preheader: (v) =>
      `تتبع ${v.tracking_number} · ${v.carrier_name} · يوصل ${v.estimated_delivery}`,
  },
  "order-delivered": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag green">تم التوصيل</span>
    <h1>يا رب كل قضمة تكون تحفة، {{first_name}}.</h1>
    <p class="greeting">أهلاً {{first_name}}،</p>
    <p>طلبك <strong>#{{order_number}}</strong> اتوصّل يوم <strong>{{delivery_date}}</strong>. نتمنى البوكس يكون وصل طازة زي يوم الخبز.</p>
    <div class="info-box"><p><strong>وُصّل إلى:</strong> {{shipping_address}}</p></div>
    <p>لو حاجة مش تمام، عندك <strong>{{return_window}} يوم</strong> تقولنا — الطزّة عندنا أولوية وهنصلّح الموضوع دايماً.</p>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{order_url}}">تفاصيل الطلب</a></div>
    <hr class="divider">
    <p style="font-size:14px;color:#3D2814;font-weight:600;">طلب صغير 🍪</p>
    <p>عجبك؟ تقييم قصير يساعد ناس تانية تكتشفنا — ويقول للخبّازين إنهم عملوا شغل حلو. <a href="{{review_url}}">سجّل تقييم سريع</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مخبوز بحب في {{company_address}}<br><a href="{{review_url}}">تقييم</a> · <a href="{{support_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "تم التوصيل",
    subject: () => `بوكس كوكي بايت وصل 🍪`,
    preheader: (v) =>
      `اتوصّل ${v.delivery_date} · ضمان جودة ${v.return_window} يوم`,
  },
  "abandoned-cart": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag warning">لسه في السلة</span>
    <h1>متسيبهمش يخلصوا، {{first_name}}.</h1>
    <p class="greeting">أهلاً {{first_name}}،</p>
    <p>سِبت كام كوكيز في السلة — والدفعات الصغيرة بتخلص بسرعة. كمّل من حيث وقفت:</p>
    <table class="order-table">
      <thead><tr><th>المنتج</th><th style="text-align:center;">الكمية</th><th style="text-align:end;">السعر</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">إجمالي السلة</td><td style="text-align:end;">{{cart_total}}</td></tr>
      </tbody>
    </table>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{cart_url}}">كمّل الطلب</a></div>
    <div class="info-box"><p>🍪 <strong>منّا ليك —</strong> استخدم <strong>{{promo_code}}</strong> وقت الدفع لخصم إضافي <strong>{{discount}}%</strong> النهارده.</p></div>
    <p style="font-size:13px;color:#9C8B7A;">العرض ينتهي خلال {{offer_expiry}}.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مخبوز بحب في {{company_address}}<br><a href="{{cart_url}}">سلتي</a> · <a href="{{privacy_url}}">الخصوصية</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "سلتك مستنياك",
    subject: () => `الكوكيز لسه في السلة 🍪`,
    preheader: (v) =>
      `إجمالي ${v.cart_total} · استخدم ${v.promo_code} لخصم ${v.discount}% — ${v.offer_expiry} باقي.`,
  },
};

export function pickArEmail(key: string): ArEmailCopy | undefined {
  return AR_EMAIL[key];
}
