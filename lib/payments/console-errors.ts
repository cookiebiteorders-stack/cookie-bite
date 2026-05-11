export type ErrorSeverity = "low" | "medium" | "critical";

export type FriendlyConsoleError = {
  title: string;
  description: string;
  severity: ErrorSeverity;
  /** للمطورين فقط — لا تُعرض للمستخدم النهائي */
  technical?: string;
};

function classify(msg: string): FriendlyConsoleError {
  const m = msg.toLowerCase();
  if (m.includes("relation") && m.includes("does not exist")) {
    return {
      title: "جدول الطلبات غير متوفر",
      description:
        "لم يتم العثور على جدول الطلبات في قاعدة البيانات. تحقق من ترحيلات Supabase أو اتصل بالدعم.",
      severity: "critical",
      technical: msg,
    };
  }
  if (m.includes("column") && m.includes("does not exist")) {
    return {
      title: "مخطط قاعدة البيانات غير متطابق",
      description:
        "عمود مطلوب غير موجود بعد الترحيل. شغّل أحدث ترحيلات المشروع أو راجع إعدادات Supabase.",
      severity: "medium",
      technical: msg,
    };
  }
  if (m.includes("jwt") || m.includes("unauthorized") || m.includes("401")) {
    return {
      title: "فشل التحقق من الهوية",
      description: "انتهت الجلسة أو مفتاح الخدمة غير صالح. أعد تسجيل الدخول أو راجع متغيرات البيئة.",
      severity: "critical",
      technical: msg,
    };
  }
  if (m.includes("network") || m.includes("fetch")) {
    return {
      title: "تعذّر الاتصال بالخادم",
      description: "تحقق من اتصال الإنترنت أو من أن خادم التطبيق يعمل، ثم أعد المحاولة.",
      severity: "low",
      technical: msg,
    };
  }
  return {
    title: "تعذّر تحميل بيانات المدفوعات",
    description:
      "حدث خطأ أثناء قراءة الطلبات. إذا استمرّ الأمر، راجع سجلات الخادم أو تواصل مع الدعم الفني.",
    severity: "medium",
    technical: msg,
  };
}

export function parseConsoleError(raw: string): FriendlyConsoleError {
  const base = raw.replace(/^Database error\s*/i, "").trim();
  return classify(base || raw);
}
