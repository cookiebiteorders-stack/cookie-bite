import { canAccess, type ModuleKey, type UserRole } from "@/lib/admin/rbac";

/** عناصر مسار `/admin` — بدون أيقونات (تُربط بالأيقونات في الواجهة). */
export type AdminConsoleNavItem = {
  href: string;
  label: string;
  module: ModuleKey;
};

export const ADMIN_CONSOLE_NAV_ITEMS: AdminConsoleNavItem[] = [
  { href: "/admin", label: "Dashboard", module: "dashboard" },
  { href: "/admin/copilot", label: "Mrs. Cookie", module: "dashboard" },
  { href: "/admin/products", label: "Products", module: "products" },
  { href: "/admin/addons", label: "Addons", module: "addons" },
  { href: "/admin/orders", label: "Orders", module: "orders" },
  { href: "/admin/customers", label: "Customers", module: "customers" },
  { href: "/admin/discounts", label: "Discounts", module: "discounts" },
  { href: "/admin/analytics", label: "Analytics", module: "analytics" },
  { href: "/admin/reports", label: "Reports", module: "analytics" },
  { href: "/admin/financial", label: "Financial", module: "financial" },
  { href: "/admin/invoices", label: "Invoices", module: "invoices" },
  { href: "/admin/payments", label: "Payments", module: "payments" },
  { href: "/admin/roles", label: "Roles", module: "roles" },
  { href: "/admin/shipping", label: "Shipping", module: "shipping" },
  { href: "/admin/audit-logs", label: "Audit Logs", module: "audit" },
  { href: "/admin/media", label: "Media", module: "media" },
  { href: "/admin/cms", label: "CMS", module: "cms" },
  { href: "/admin/template-library", label: "Templates", module: "templates" },
  { href: "/admin/email", label: "Email", module: "settings" },
  { href: "/admin/settings", label: "Settings", module: "settings" },
];

export function getAccessibleAdminConsoleNav(role: UserRole): AdminConsoleNavItem[] {
  return ADMIN_CONSOLE_NAV_ITEMS.filter((item) => canAccess(role, item.module));
}

/** يطابق الصفحة الحالية مع عنصر التنقل (لوحة الإدارة). */
export function resolveCurrentAdminConsolePage(
  pathname: string,
  navItems: AdminConsoleNavItem[],
): AdminConsoleNavItem | undefined {
  const exact = navItems.find((item) => pathname === item.href);
  if (exact) return exact;
  return navItems.find(
    (item) => item.href !== "/admin" && pathname.startsWith(`${item.href}/`),
  );
}
