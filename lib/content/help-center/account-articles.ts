import type { HelpCenterArticle } from "@/lib/content/help-center/types";

export const ACCOUNT_HELP_ARTICLES: HelpCenterArticle[] = [
  {
    id: "a1",
    categoryId: "account",
    icon: "🔑",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "كيف أسجّل الدخول إلى حسابي؟", en: "How do I sign in to my account?" },
    description: {
      ar: "خطوات تسجيل الدخول عبر البريد أو رقم الهاتف.",
      en: "Sign in with email and password or phone verification.",
    },
    preview: {
      ar: "خطوات تسجيل الدخول عبر البريد أو رقم الهاتف.",
      en: "Sign in with email or phone.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "تسجيل الدخول إلى حساب Cookie Bite سهل وسريع. يمكنك الدخول بطريقتين مختلفتين.",
          ],
        },
        {
          heading: "الدخول بالبريد الإلكتروني وكلمة السر",
          steps: [
            "اضغط على أيقونة الشخص في أعلى الصفحة أو اذهب إلى صفحة تسجيل الدخول.",
            "أدخل بريدك الإلكتروني المسجّل.",
            "أدخل كلمة السر ثم اضغط على «دخول».",
            "سيتم توجيهك تلقائياً إلى الصفحة الرئيسية.",
          ],
        },
        {
          heading: "الدخول برقم الهاتف",
          steps: [
            "اختر خيار «الدخول بالهاتف».",
            "أدخل رقم هاتفك المحمول.",
            "ستصلك رسالة نصية تحتوي على رمز تحقق مكوّن من 6 أرقام.",
            "أدخل الرمز وسيفتح حسابك فوراً.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 نصيحة: إذا كنت تستخدم جهازاً شخصياً، يمكنك تفعيل خيار «تذكّرني» لتجنّب تكرار الدخول في كل مرة.",
          },
        },
        {
          heading: "مشكلة في الدخول؟",
          paragraphs: [
            "تأكد من أن البريد الإلكتروني أو رقم الهاتف مسجّل لدينا. إذا كنت عميلاً جديداً، اضغط على «إنشاء حساب» أولاً. وإذا نسيت كلمة السر، راجع مقالة «كيف أعيد تعيين كلمة السر؟».",
          ],
        },
      ],
      en: [
        {
          paragraphs: [
            "Signing in to your Cookie Bite account is quick. You can use email and password or phone verification.",
          ],
        },
        {
          heading: "Sign in with email and password",
          steps: [
            "Tap the profile icon at the top of the site or open the sign-in page.",
            "Enter your registered email address.",
            "Enter your password and tap Sign in.",
            "You will be redirected to the homepage.",
          ],
        },
        {
          heading: "Sign in with phone",
          steps: [
            "Choose the phone sign-in option.",
            "Enter your mobile number.",
            "You will receive a 6-digit verification code by SMS.",
            "Enter the code to access your account.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Tip: On a personal device, enable “Remember me” so you do not need to sign in every visit.",
          },
        },
        {
          heading: "Trouble signing in?",
          paragraphs: [
            "Make sure your email or phone is registered with us. New customers should create an account first. If you forgot your password, see our reset-password article.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/sign-in", label: { ar: "تسجيل الدخول", en: "Sign in" } },
      { href: "/sign-up", label: { ar: "إنشاء حساب", en: "Create account" } },
      { href: "/help/articles/a2", label: { ar: "إعادة تعيين كلمة السر", en: "Reset password" } },
    ],
  },
  {
    id: "a2",
    categoryId: "account",
    icon: "🔐",
    readTime: { ar: "دقيقتان", en: "2 min read" },
    title: { ar: "كيف أعيد تعيين كلمة السر؟", en: "How do I reset my password?" },
    description: {
      ar: "خطوات استعادة الوصول إلى حسابك إذا نسيت كلمة السر.",
      en: "Recover access if you forgot your password.",
    },
    preview: {
      ar: "خطوات استعادة الوصول إلى حسابك إذا نسيت كلمة السر.",
      en: "Recover access if you forgot your password.",
    },
    blocks: {
      ar: [
        {
          paragraphs: [
            "لا تقلق إذا نسيت كلمة السر — استعادة حسابك خطوات بسيطة لا تستغرق أكثر من دقيقتين.",
          ],
        },
        {
          heading: "خطوات إعادة تعيين كلمة السر",
          steps: [
            "اذهب إلى صفحة تسجيل الدخول.",
            "اضغط على رابط «نسيت كلمة السر؟» أسفل حقل كلمة السر.",
            "أدخل بريدك الإلكتروني المسجّل واضغط «إرسال».",
            "ستصلك رسالة بريد إلكتروني تحتوي على رابط إعادة التعيين — تحقق من مجلد «البريد المزعج (Spam)» إذا لم تجدها في البريد الوارد.",
            "اضغط على الرابط وأدخل كلمة سر جديدة (8 أحرف على الأقل، تحتوي على أرقام وحروف).",
            "احفظ التغيير وادخل إلى حسابك.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ رابط إعادة التعيين صالح لمدة 30 دقيقة فقط. إذا انتهت المدة، كرّر الخطوات من البداية.",
          },
        },
        {
          heading: "لم يصلني البريد؟",
          paragraphs: [
            "انتظر حتى 5 دقائق، ثم تحقق من مجلد Spam أو Junk. إذا لم يصل، تواصل مع فريق الدعم عبر الدردشة المباشرة وسنساعدك فوراً.",
          ],
        },
      ],
      en: [
        {
          paragraphs: [
            "If you forgot your password, recovery usually takes less than two minutes.",
          ],
        },
        {
          heading: "Reset steps",
          steps: [
            "Open the sign-in page.",
            "Tap Forgot password below the password field.",
            "Enter your registered email and submit.",
            "Check your inbox for the reset link — also check spam or junk folders.",
            "Open the link and set a new password (at least 8 characters, letters and numbers).",
            "Save and sign in with your new password.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Reset links expire after 30 minutes. Request a new link if yours has expired.",
          },
        },
        {
          heading: "Email not arriving?",
          paragraphs: [
            "Wait up to 5 minutes and check spam folders. If it still does not arrive, contact support and we will help right away.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/sign-in", label: { ar: "تسجيل الدخول", en: "Sign in" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
    ],
  },
  {
    id: "a3",
    categoryId: "account",
    icon: "✏️",
    readTime: { ar: "دقيقة", en: "1 min read" },
    title: { ar: "كيف أحدّث بياناتي الشخصية؟", en: "How do I update my profile?" },
    description: {
      ar: "تغيير الاسم أو البريد الإلكتروني أو رقم الهاتف في حسابك.",
      en: "Change your name, email, or phone in your account.",
    },
    preview: {
      ar: "تغيير الاسم أو البريد الإلكتروني أو رقم الهاتف في حسابك.",
      en: "Change your name, email, or phone.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["يمكنك تحديث بياناتك الشخصية في أي وقت من داخل حسابك مباشرةً."],
        },
        {
          heading: "تعديل الاسم ورقم الهاتف",
          steps: [
            "سجّل الدخول إلى حسابك.",
            "اضغط على صورة الحساب أو اسمك في الزاوية العلوية.",
            "اختر «الملف الشخصي» أو «إعدادات الحساب».",
            "عدّل الحقل الذي تريده ثم اضغط «حفظ».",
          ],
        },
        {
          heading: "تغيير البريد الإلكتروني",
          paragraphs: [
            "تغيير البريد الإلكتروني يتطلب تحقّقاً إضافياً. بعد إدخال البريد الجديد، ستصلك رسالة تأكيد — اضغط على الرابط فيها لإتمام التغيير.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 تذكّر: إذا غيّرت البريد الإلكتروني، ستحتاج إلى استخدامه في عمليات تسجيل الدخول القادمة.",
          },
        },
        {
          heading: "تغيير الصورة الشخصية",
          paragraphs: [
            "اضغط على صورتك الحالية في صفحة الملف الشخصي ثم اختر «رفع صورة» لتحميل صورة جديدة من جهازك.",
          ],
        },
      ],
      en: [
        {
          paragraphs: ["You can update your personal details anytime from your account."],
        },
        {
          heading: "Edit name and phone",
          steps: [
            "Sign in to your account.",
            "Open your profile from the account menu.",
            "Go to Profile or Account settings.",
            "Edit the field you need and save.",
          ],
        },
        {
          heading: "Change email",
          paragraphs: [
            "Changing email requires verification. After you enter the new address, confirm via the link we send you.",
          ],
        },
        {
          callout: {
            variant: "tip",
            text: "💡 Remember: you will need the new email the next time you sign in.",
          },
        },
        {
          heading: "Profile photo",
          paragraphs: [
            "Tap your current photo on the profile page and upload a new image from your device.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/account/settings", label: { ar: "إعدادات الحساب", en: "Account settings" } },
      { href: "/account", label: { ar: "حسابي", en: "My account" } },
    ],
  },
  {
    id: "a4",
    categoryId: "account",
    icon: "🗑️",
    readTime: { ar: "٣ دقائق", en: "3 min read" },
    title: { ar: "كيف أحذف حسابي؟", en: "How do I delete my account?" },
    description: {
      ar: "خطوات إغلاق حسابك بشكل دائم وما الذي سيحدث لبياناتك.",
      en: "Permanently close your account and what happens to your data.",
    },
    preview: {
      ar: "خطوات إغلاق حسابك بشكل دائم وما الذي سيحدث لبياناتك.",
      en: "Permanently close your account.",
    },
    blocks: {
      ar: [
        {
          paragraphs: ["نأسف لرؤيتك تغادر! لكن إذا كان قرارك نهائياً، إليك ما تحتاج معرفته."],
        },
        {
          heading: "قبل الحذف — تأكد من هذه النقاط",
          list: [
            "لا توجد طلبات معلّقة أو قيد التوصيل.",
            "استلمت أي رصيد أو استرداد مستحق لك.",
            "حفظت أي فواتير أو إيصالات تحتاجها.",
          ],
        },
        {
          heading: "خطوات حذف الحساب",
          steps: [
            "اذهب إلى إعدادات الحساب ← الخصوصية.",
            "اضغط على «حذف الحساب» في أسفل الصفحة.",
            "اقرأ التحذيرات وأكّد هويتك بإدخال كلمة السر.",
            "اضغط «نعم، احذف حسابي».",
            "ستصلك رسالة تأكيد نهائية على بريدك الإلكتروني.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ حذف الحساب لا يمكن التراجع عنه. سيتم حذف جميع بياناتك وسجل طلباتك بشكل نهائي خلال 30 يوماً.",
          },
        },
        {
          paragraphs: [
            "إذا كنت تواجه مشكلة معينة دفعتك لهذا القرار، يسعدنا مساعدتك قبل اتخاذ هذه الخطوة — تواصل معنا عبر الدردشة المباشرة.",
          ],
        },
      ],
      en: [
        {
          paragraphs: [
            "We are sorry to see you go. If you are sure, here is what you should know before deleting your account.",
          ],
        },
        {
          heading: "Before you delete",
          list: [
            "No orders are pending or out for delivery.",
            "You have received any refunds or store credit owed to you.",
            "You saved any receipts or invoices you need.",
          ],
        },
        {
          heading: "Deletion steps",
          steps: [
            "Open Account settings → Privacy.",
            "Tap Delete account at the bottom.",
            "Read the warnings and confirm with your password.",
            "Confirm permanent deletion.",
            "You will receive a final confirmation email.",
          ],
        },
        {
          callout: {
            variant: "warn",
            text: "⚠️ Account deletion cannot be undone. Your data and order history are permanently removed within 30 days.",
          },
        },
        {
          paragraphs: [
            "If something went wrong with an order, contact us first — we may be able to help without closing your account.",
          ],
        },
      ],
    },
    relatedLinks: [
      { href: "/account/settings", label: { ar: "إعدادات الحساب", en: "Account settings" } },
      { href: "/contact", label: { ar: "تواصل معنا", en: "Contact us" } },
    ],
  },
];
