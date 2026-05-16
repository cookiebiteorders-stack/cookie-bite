import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BadgePercent,
  Boxes,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutTemplate,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";

const iconByHref: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/copilot": Sparkles,
  "/admin/products": Boxes,
  "/admin/orders": ShoppingCart,
  "/admin/customers": Users,
  "/admin/discounts": BadgePercent,
  "/admin/reports": BarChart3,
  "/admin/financial": Wallet,
  "/admin/invoices": Receipt,
  "/admin/payments": CreditCard,
  "/admin/roles": Shield,
  "/admin/shipping": Truck,
  "/admin/audit-logs": FileText,
  "/admin/template-library": LayoutTemplate,
  "/admin/settings": Settings,
};

export function getAdminNavIcon(item: AdminConsoleNavItem): LucideIcon {
  return iconByHref[item.href] ?? LayoutDashboard;
}
