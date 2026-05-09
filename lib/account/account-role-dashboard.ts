import type { UserRole } from "@/lib/admin/rbac";

/** نصوص لوحة الحساب حسب الدور — ثنائية اللغة للعناوين والنقاط. */
export type AccountRoleDashboardCopy = {
  titleEn: string;
  titleAr: string;
  perksEn: string[];
  perksAr: string[];
};

export const ACCOUNT_ROLE_DASHBOARD_COPY: Record<UserRole, AccountRoleDashboardCopy> = {
  owner: {
    titleEn: "Owner workspace",
    titleAr: "مساحة المالك — صلاحيات كاملة",
    perksEn: [
      "Full admin console: products, orders, customers, and operations",
      "Financials, payments, and store settings",
      "Team roles & access (Roles)",
      "Audit logs and compliance visibility",
    ],
    perksAr: [
      "لوحة إدارة كاملة: المنتجات، الطلبات، العملاء، والتشغيل",
      "المالية، المدفوعات، وإعدادات المتجر",
      "أدوار الفريق والصلاحيات (Roles)",
      "سجلات التدقيق ورؤية الامتثال",
    ],
  },
  admin: {
    titleEn: "Admin workspace",
    titleAr: "مساحة المشرف — صلاحيات تشغيل واسعة",
    perksEn: [
      "Manage products, orders, customers, shipping, and invoices",
      "Content, media, and reports (within your access level)",
      "Discounts with limits; read-only audit where enabled",
      "No access to financial totals, payments, roles, or system settings",
    ],
    perksAr: [
      "إدارة المنتجات والطلبات والعملاء والشحن والفواتير",
      "المحتوى والوسائط والتقارير (ضمن مستوى وصولك)",
      "الخصومات بحدود محددة؛ تدقيق للقراءة حيث يُسمح",
      "بدون الوصول للمالية الإجمالية أو المدفوعات أو الأدوار أو إعدادات النظام",
    ],
  },
  staff: {
    titleEn: "Staff workspace",
    titleAr: "مساحة الموظف — صلاحيات محدودة",
    perksEn: [
      "View products and customer records; help fulfill orders",
      "Limited order and shipping updates",
      "No discounts, CMS, analytics, or sensitive financial areas",
    ],
    perksAr: [
      "عرض المنتجات وسجلات العملاء؛ المساعدة في تنفيذ الطلبات",
      "تحديثات محدودة للطلب والشحن",
      "بدون خصومات أو نظام إدارة المحتوى أو تحليلات أو مناطق مالية حساسة",
    ],
  },
  customer: {
    titleEn: "Member dashboard",
    titleAr: "لوحة العضو",
    perksEn: [
      "Track orders, rewards, and saved addresses",
      "Wishlist and profile managed securely via Clerk",
    ],
    perksAr: [
      "متابعة الطلبات والنقاط والعناوين المحفوظة",
      "قائمة الأمنيات والملف الشخصي عبر Clerk بأمان",
    ],
  },
};

export function accountRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case "owner":
      return "bg-amber-600 text-white ring-1 ring-amber-800/40";
    case "admin":
      return "bg-cb-terracotta-dark text-white";
    case "staff":
      return "bg-cb-text-strong/90 text-cb-cream";
    default:
      return "bg-cb-terracotta-dark text-white";
  }
}
