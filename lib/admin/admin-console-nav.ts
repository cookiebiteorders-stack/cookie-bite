import { canAccess, type ModuleKey, type UserRole } from "@/lib/admin/rbac";

/** عناصر مسار `/admin` — التسمية عبر adminNav.* في translations. */
export type AdminConsoleNavItem = {
  href: string;
  navKey: string;
  module: ModuleKey;
};

export const ADMIN_CONSOLE_NAV_ITEMS: AdminConsoleNavItem[] = [
  { href: "/admin", navKey: "dashboard", module: "dashboard" },
  { href: "/admin/copilot", navKey: "copilot", module: "dashboard" },
  { href: "/admin/products", navKey: "products", module: "products" },
  { href: "/admin/addons", navKey: "addons", module: "addons" },
  { href: "/admin/orders", navKey: "orders", module: "orders" },
  { href: "/admin/kitchen", navKey: "kitchen", module: "orders" },
  { href: "/admin/customers", navKey: "customers", module: "customers" },
  { href: "/admin/discounts", navKey: "discounts", module: "discounts" },
  { href: "/admin/analytics", navKey: "analytics", module: "analytics" },
  { href: "/admin/reports", navKey: "reports", module: "analytics" },
  { href: "/admin/financial", navKey: "financial", module: "financial" },
  { href: "/admin/invoices", navKey: "invoices", module: "invoices" },
  { href: "/admin/payments", navKey: "payments", module: "payments" },
  { href: "/admin/roles", navKey: "roles", module: "roles" },
  { href: "/admin/shipping", navKey: "shipping", module: "shipping" },
  { href: "/admin/audit-logs", navKey: "audit", module: "audit" },
  { href: "/admin/media", navKey: "media", module: "media" },
  { href: "/admin/cms", navKey: "cms", module: "cms" },
  { href: "/admin/template-library", navKey: "templates", module: "templates" },
  { href: "/admin/email", navKey: "email", module: "settings" },
  { href: "/admin/settings", navKey: "settings", module: "settings" },
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
