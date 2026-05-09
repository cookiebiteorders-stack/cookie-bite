import {
  roleMatrix,
  type ModuleKey,
  type PermissionLevel,
  type UserRole,
} from "@/lib/admin/rbac";

const MODULE_LABEL_AR: Record<ModuleKey, string> = {
  dashboard: "لوحة التحكم",
  products: "المنتجات",
  orders: "الطلبات",
  customers: "العملاء",
  discounts: "الخصومات",
  media: "الوسائط",
  cms: "المحتوى",
  analytics: "التقارير والتحليلات",
  financial: "المالية",
  invoices: "الفواتير",
  shipping: "الشحن",
  payments: "المدفوعات",
  roles: "الأدوار والصلاحيات",
  settings: "الإعدادات",
  audit: "سجل التدقيق",
};

function explainLevel(level: PermissionLevel): { ar: string; en: string } {
  switch (level) {
    case "full":
      return {
        ar: "كامل حسب شاشة الإدارة (قراءة/تعديل/إعدادات حسب الوحدة)",
        en: "Full access for that admin module (read/write/configure as applicable)",
      };
    case "limited":
      return {
        ar: "محدود — بعض الإجراءات أو البيانات فقط",
        en: "Limited — partial actions or scoped data",
      };
    case "view":
      return { ar: "عرض فقط", en: "View-only" };
    default:
      return { ar: "لا وصول من لوحة الإدارة", en: "No admin module access" };
  }
}

/** ملخص صلاحيات يُحقن في CONTEXT للنموذج — يجب أن يطابق لوحة الإدارة فعلياً. */
export function buildMrBrowniePermissions(role: UserRole | "guest") {
  if (role === "guest") {
    return {
      effective_role: "guest" as const,
      chat_capabilities: {
        ar: [
          "اقتراح منتجات وهدايا من الكتالوج في السياق",
          "مساعدة السلة والتوصيل والعروض الظاهرة في السياق",
          "أسئلة عامة عن العلامة والمنطقة الزمنية للمتجر",
        ],
        en: [
          "Product & gift ideas from catalog in CONTEXT",
          "Cart, delivery threshold, promos as shown in CONTEXT",
          "General brand / area FAQ",
        ],
      },
      denied_always: {
        ar: [
          "إيرادات أو تحليلات داخلية أو أعداد طلبات تشغيلية",
          "بيانات عملاء آخرين أو معرفات حساسة",
          "تعديل صلاحيات أو محتوى لوحة الإدارة من المحادثة",
        ],
        en: [
          "Internal revenue, analytics, operational order counts",
          "Other customers' data / sensitive IDs",
          "Changing admin roles or CMS from chat",
        ],
      },
    };
  }

  const matrix = roleMatrix[role];
  const modules: Record<
    string,
    {
      level: PermissionLevel;
      label_ar: string;
      hint: { ar: string; en: string };
    }
  > = {};

  (Object.keys(matrix) as ModuleKey[]).forEach((key) => {
    const level = matrix[key];
    modules[key] = {
      level,
      label_ar: MODULE_LABEL_AR[key],
      hint: explainLevel(level),
    };
  });

  return {
    effective_role: role,
    rbac_source: "Cookie Bite admin matrix (must match live dashboard)",
    modules,
    chat_notes:
      {
        staff: {
          ar: "ركّز على التنفيذ: الطلبات، الشحن، المنتجات المعروضة؛ لا تُبدِ استراتيجية المالك بدون بيانات في السياق.",
          en: "Ops-first: orders, shipping, catalog; avoid owner-level strategy unless CONTEXT supports it.",
        },
        admin: {
          ar: "تحليل أعمال مع مقاييس السياق؛ لا تُخترع أرقاماً؛ الأدوار/الإعدادات الحساسة غير متاحة في مصفوفة المشرف.",
          en: "Business analytics from CONTEXT only; no fabricated metrics; roles/settings modules are out of scope for admin RBAC.",
        },
        owner: {
          ar: "طبقة تنفيذية كاملة مع الحفاظ على خصوصية العملاء (لا بيانات تعريف شخصية خام من السياق).",
          en: "Full executive layer; never leak raw customer PII from CONTEXT.",
        },
        customer: {
          ar: "تجربة تسوق فقط؛ الطلبات كما تظهر لحساب المستخدم في الموقع.",
          en: "Shopping experience; orders as visible to the signed-in customer on the site.",
        },
      }[role],
  };
}
