type EmailVars = Record<string, string | number | undefined | null>;

type ArEmailCopy = {
  body: string;
  title: string;
  subject: (v: EmailVars) => string;
  preheader: (v: EmailVars) => string;
};

export const AR_EMAIL: Record<string, ArEmailCopy> = {
  "welcome-prelaunch": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag">شكراً لانضمامك</span>
    <h1>أهلاً {{first_name}} — سعداء بوجودك معنا.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>شكراً لإنشاء حسابك في <strong>كوكي بايت</strong>. نضع اللمسات الأخيرة على متجرنا الإلكتروني، و<strong>لا نقبل الطلبات حالياً</strong>.</p>
    <div class="info-box"><p>🔔 <strong>سنرسل لك بريداً فور فتح الطلبات.</strong> لا حاجة لأي إجراء — سنُبلغك لحظة إمكانية طلب أول صندوق لك.</p></div>
    <p>يمكنك في هذه الأثناء تصفّح النكهات والتعرّف علينا — الدفع سيبقى معطّلاً حتى نكون جاهزين.</p>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{shop_url}}">زيارة المتجر</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;margin-top:18px;">أسئلة؟ رد على هذا البريد أو زُر <a href="{{help_url}}">مركز المساعدة</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{shop_url}}">المتجر</a> · <a href="{{help_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "أهلاً بك في كوكي بايت",
    subject: (v) =>
      `أهلاً بك في كوكي بايت، ${v.first_name ?? "عزيزنا"} — سنُبلغك عند فتح الطلبات`,
    preheader: () =>
      "شكراً لتسجيلك — لا نقبل طلبات بعد، وسنرسل لك بريداً عند الجاهزية.",
  },
  welcome: {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag">أهلاً بك</span>
    <h1>سعداء بانضمامك، {{first_name}}.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>أهلاً بك في <strong>كوكي بايت</strong> — مخبزنا في التجمع الخامس يصنع كوكيز متقنة من زبدة حقيقية وشوكولاتة فاخرة. حسابك جاهز، وهدية ترحيب بانتظارك.</p>
    <div class="info-box"><p>🎁 <strong>هدية ترحيب —</strong> استخدم <strong>{{welcome_code}}</strong> عند الدفع لخصم <strong>{{welcome_discount}}%</strong> على أول طلب. صالح لمدة {{welcome_validity_days}} يوماً.</p></div>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{shop_url}}">استكشف نكهات الأسبوع</a></div>
    <hr class="divider">
    <div class="two-col">
      <div class="col-box"><h4>طازة كل يوم</h4><p>معظم الطلبات تُخبز في نفس يوم التحضير من المطبخ.</p></div>
      <div class="col-box"><h4>توصيل مجاني فوق {{free_shipping_threshold_egp}} جنيه</h4><p>في التجمع الخامس والمناطق المحيطة.</p></div>
    </div>
    <p style="font-size:13px;color:#9C8B7A;margin-top:18px;">تحتاج مساعدة؟ رد على هذا البريد — فريقنا يقرأ كل رسالة. أو زُر <a href="{{help_url}}">مركز المساعدة</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{shop_url}}">المتجر</a> · <a href="{{help_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "أهلاً بك في كوكي بايت",
    subject: (v) => `أهلاً بك في كوكي بايت، ${v.first_name ?? "عزيزنا"}`,
    preheader: (v) =>
      `حسابك جاهز — وهدية ${v.welcome_discount ?? 10}% بانتظارك.`,
  },
  "order-confirmed": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag">الطلب قيد المراجعة</span>
    <h1>شكراً {{first_name}} — استلمنا طلبك وهو الآن قيد المراجعة.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>طلبك <strong>#{{order_number}}</strong> وصلنا بنجاح ويجري مراجعته الآن من الفريق.</p>
    <div class="info-box"><p>⏱️ <strong>مدة المراجعة:</strong> سيتم تأكيد الطلب أو الاعتذار عنه خلال <strong>12–24 ساعة</strong>. سنرسل لك التحديث فوراً عبر البريد وواتساب.</p></div>
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
    <div class="info-box"><p>تحتاج تعديل عنوان التوصيل أو إضافة رسالة هدية؟ رد على هذا البريد بسرعة قبل اعتماد الطلب.</p></div>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{order_url}}">تتبع الطلب</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">أسئلة؟ رد على البريد أو تواصل عبر واتساب — نرد عادةً خلال ساعة.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{order_url}}">طلباتي</a> · <a href="{{privacy_url}}">الخصوصية</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "الطلب قيد المراجعة",
    subject: (v) =>
      `استلمنا طلب #${v.order_number} — قيد المراجعة خلال 12–24 ساعة`,
    preheader: (v) =>
      `شكراً ${v.first_name ?? ""} — طلبك قيد المراجعة الآن، وسنؤكده خلال 12–24 ساعة.`,
  },
  "order-shipped": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag info">في الطريق</span>
    <h1>طلبك في الطريق، {{first_name}}.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>طلبك <strong>#{{order_number}}</strong> غادر المطبخ مع <strong>{{carrier_name}}</strong>. مُغلّف بعناية وجاهز للتسليم.</p>
    <div class="tracking-box">
      <p>رقم التتبع</p>
      <div class="tracking-num">{{tracking_number}}</div>
      <p style="color:#5C3A21;font-weight:500;letter-spacing:0;">التوصيل المتوقع · {{estimated_delivery}}</p>
    </div>
    <div style="text-align:center;margin:18px 0;"><a class="cta-btn" href="{{tracking_url}}">تتبع الشحنة</a></div>
    <div class="info-box"><p><strong>نصيحة:</strong> إن لم تتناولها الآن، احفظ الكوكيز في علبة محكمة على درجة حرارة الغرفة — تبقى بجودتها حتى 7 أيام.</p></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">لم تتوقع هذا الطلب؟ <a href="{{contact_url}}">تواصل معنا</a> فوراً — وسنعالج الأمر.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{tracking_url}}">تتبع</a> · <a href="{{contact_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "طلبك في الطريق",
    subject: (v) => `طلب كوكي بايت #${v.order_number} في الطريق 🚚`,
    preheader: (v) =>
      `تتبع ${v.tracking_number} · ${v.carrier_name} · يصل ${v.estimated_delivery}`,
  },
  "order-delivered": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag green">تم التوصيل</span>
    <h1>نتمنى أن تستمتع بكل لقمة، {{first_name}}.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>طلبك <strong>#{{order_number}}</strong> وُصّل يوم <strong>{{delivery_date}}</strong>. نأمل أن يكون طازجاً كيوم الخبز.</p>
    <div class="info-box"><p><strong>وُصّل إلى:</strong> {{shipping_address}}</p></div>
    <p>إن وُجد أي خلل، لديك <strong>{{return_window}} يوماً</strong> لإبلاغنا — جودة الطازة أولويتنا وسنعالج الأمر.</p>
    <div style="text-align:center;margin:20px 0;"><a class="cta-btn" href="{{order_url}}">تفاصيل الطلب</a></div>
    <hr class="divider">
    <p style="font-size:14px;color:#3D2814;font-weight:600;">طلب صغير 🍪</p>
    <p>أعجبتك التجربة؟ تقييم قصير يساعد آخرين على اكتشافنا — ويشجّع فريقنا على الاستمرار. <a href="{{review_url}}">سجّل تقييمك</a>.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{review_url}}">تقييم</a> · <a href="{{support_url}}">مساعدة</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "تم التوصيل",
    subject: () => `طلب كوكي بايت وصل 🍪`,
    preheader: (v) =>
      `وُصّل ${v.delivery_date} · ضمان جودة ${v.return_window} يوماً`,
  },
  "abandoned-cart": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag warning">سلة غير مكتملة</span>
    <h1>لا تفوّت اختياراتك، {{first_name}}.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>تركت بعض الكوكيز في السلة — والدفعات الصغيرة تنفد بسرعة. أكمل طلبك من حيث توقفت:</p>
    <table class="order-table">
      <thead><tr><th>المنتج</th><th style="text-align:center;">الكمية</th><th style="text-align:end;">السعر</th></tr></thead>
      <tbody>
        {{items_rows}}
        <tr class="total-row"><td colspan="2">إجمالي السلة</td><td style="text-align:end;">{{cart_total}}</td></tr>
      </tbody>
    </table>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{cart_url}}">إتمام الطلب</a></div>
    <div class="info-box"><p>🍪 <strong>عرض خاص —</strong> استخدم <strong>{{promo_code}}</strong> عند الدفع لخصم إضافي <strong>{{discount}}%</strong> اليوم.</p></div>
    <p style="font-size:13px;color:#9C8B7A;">ينتهي العرض خلال {{offer_expiry}}.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{cart_url}}">سلتي</a> · <a href="{{privacy_url}}">الخصوصية</a> · <a href="{{unsubscribe_url}}">إلغاء الاشتراك</a></p></div>
</div>
`,
    title: "سلتك بانتظارك",
    subject: () => `كوكيزك ما زالت في السلة 🍪`,
    preheader: (v) =>
      `إجمالي ${v.cart_total} · استخدم ${v.promo_code} لخصم ${v.discount}% — ينتهي خلال ${v.offer_expiry}.`,
  },
  "account-deleted": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag warning">تحديث الحساب</span>
    <h1>تم حذف حسابك.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>نؤكد لك أن حساب <strong>كوكي بايت</strong> المرتبط بـ <strong>{{email_address}}</strong> أُزيل نهائياً بتاريخ <strong>{{action_date}}</strong>.</p>
    <div class="info-box"><p>سجل طلباتك وتفضيلاتك المحفوظة لم تعد متاحة في نظامنا. يمكنك إنشاء حساب جديد في أي وقت باستخدام نفس البريد.</p></div>
    <p style="font-size:13px;color:#9C8B7A;">إن لم تطلب ذلك أو تعتقد أنه خطأ، <a href="{{contact_url}}">تواصل مع فريقنا</a> — نسعد بمساعدتك.</p>
    <div style="text-align:center;margin:22px 0;"><a class="cta-btn" href="{{shop_url}}">زيارة كوكي بايت</a></div>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;">أسئلة؟ زُر <a href="{{help_url}}">مركز المساعدة</a> أو رد على هذا البريد.</p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{help_url}}">مساعدة</a> · <a href="{{privacy_url}}">الخصوصية</a></p></div>
</div>
`,
    title: "تم حذف الحساب",
    subject: (v) => `تم حذف حسابك في كوكي بايت — ${v.email_address ?? ""}`,
    preheader: (v) =>
      `أُزيل الحساب المرتبط بـ ${v.email_address ?? "بريدك"} بتاريخ ${v.action_date ?? ""}.`,
  },
  "account-blocked": {
    body: `
<div class="email-wrapper">
  <div class="email-header"><div class="logo">كوكي بايت</div></div>
  <div class="email-body">
    <span class="tag red">إيقاف الحساب</span>
    <h1>تم إيقاف وصولك إلى الحساب.</h1>
    <p class="greeting">مرحباً {{first_name}}،</p>
    <p>أُوقف حساب <strong>كوكي بايت</strong> المرتبط بـ <strong>{{email_address}}</strong> بتاريخ <strong>{{action_date}}</strong>. لم يعد بإمكانك التسجيل أو تسجيل الدخول بهذا البريد.</p>
    <table class="tbl">
      <thead><tr><th>التفاصيل</th><th>المعلومات</th></tr></thead>
      <tbody>
        <tr><td>البريد</td><td>{{email_address}}</td></tr>
        <tr><td>التاريخ</td><td>{{action_date}}</td></tr>
        <tr><td>السبب</td><td>{{action_reason}}</td></tr>
      </tbody>
    </table>
    <div class="info-box" style="border-left-color:#DC2626;background:#FEE2E2;">
      <p style="color:#7F1D1D;"><strong>ماذا يعني ذلك:</strong> حُذف ملفك الشخصي ولا يمكن استخدام هذا البريد للتسجيل مستقبلاً.</p>
    </div>
    <p style="font-size:13px;color:#9C8B7A;">إن اعتقدت أن هذا خطأ، <a href="{{contact_url}}">تواصل معنا</a> مع ذكر بريدك المسجّل لمراجعة الحالة.</p>
    <hr class="divider">
    <p style="font-size:13px;color:#9C8B7A;"><a href="{{help_url}}">مركز المساعدة</a> · <a href="{{privacy_url}}">سياسة الخصوصية</a></p>
  </div>
  <div class="email-footer"><p>© 2026 كوكي بايت · مُخبز بعناية في {{company_address}}<br><a href="{{help_url}}">مساعدة</a> · <a href="{{privacy_url}}">الخصوصية</a></p></div>
</div>
`,
    title: "إيقاف الحساب",
    subject: (v) => `تم إيقاف حسابك في كوكي بايت — ${v.email_address ?? ""}`,
    preheader: (v) =>
      `أُوقف الوصول لـ ${v.email_address ?? "بريدك"} بتاريخ ${v.action_date ?? ""}.`,
  },
};

export function pickArEmail(key: string): ArEmailCopy | undefined {
  return AR_EMAIL[key];
}
