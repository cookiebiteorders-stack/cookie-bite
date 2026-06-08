/** Human-readable labels for automated email events (admin UI). */
export const EMAIL_EVENT_CATALOG: Record<
  string,
  { labelAr: string; labelEn: string; descriptionAr: string }
> = {
  user_registered: {
    labelAr: "ترحيب بالعميل الجديد",
    labelEn: "New customer welcome",
    descriptionAr: "يُرسَل تلقائياً عند إنشاء حساب جديد.",
  },
  order_created: {
    labelAr: "تأكيد الطلب",
    labelEn: "Order confirmed",
    descriptionAr: "يُرسَل عند إنشاء طلب جديد.",
  },
  order_shipped: {
    labelAr: "تم الشحن",
    labelEn: "Order shipped",
    descriptionAr: "يُرسَل عند شحن الطلب.",
  },
  password_reset: {
    labelAr: "إعادة تعيين كلمة المرور",
    labelEn: "Password reset",
    descriptionAr: "يُرسَل عند طلب استعادة كلمة المرور.",
  },
};

export function getEmailEventLabel(eventName: string, lang: "ar" | "en" = "ar"): string {
  const entry = EMAIL_EVENT_CATALOG[eventName];
  if (!entry) return eventName;
  return lang === "ar" ? entry.labelAr : entry.labelEn;
}
