import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BadgePercent,
  Boxes,
  Cookie,
  CreditCard,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Newspaper,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";

const iconByHref: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/copilot": Cookie,
  "/admin/products": Boxes,
  "/admin/addons": Boxes,
  "/admin/orders": ShoppingCart,
  "/admin/customers": Users,
  "/admin/discounts": BadgePercent,
  "/admin/analytics": Activity,
  "/admin/reports": BarChart3,
  "/admin/financial": Wallet,
  "/admin/invoices": Receipt,
  "/admin/payments": CreditCard,
  "/admin/roles": Shield,
  "/admin/shipping": Truck,
  "/admin/audit-logs": FileText,
  "/admin/media": ImageIcon,
  "/admin/cms": Newspaper,
  "/admin/template-library": LayoutTemplate,
  "/admin/settings": Settings,
};

export function getAdminNavIcon(item: AdminConsoleNavItem): LucideIcon {
  return iconByHref[item.href] ?? LayoutDashboard;
}
