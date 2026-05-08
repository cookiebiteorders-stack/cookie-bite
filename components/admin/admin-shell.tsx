"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  BarChart3,
  Bell,
  Boxes,
  BadgePercent,
  Truck,
  Wallet,
  Shield,
  Receipt,
  CreditCard,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";
import { canAccess, type ModuleKey, type UserRole, getRoleLabel } from "@/lib/admin/rbac";

type AdminShellProps = {
  role: UserRole;
  children: React.ReactNode;
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" as ModuleKey },
  { href: "/admin/products", label: "Products", icon: Boxes, module: "products" as ModuleKey },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, module: "orders" as ModuleKey },
  { href: "/admin/customers", label: "Customers", icon: Users, module: "customers" as ModuleKey },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent, module: "discounts" as ModuleKey },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, module: "analytics" as ModuleKey },
  { href: "/admin/financial", label: "Financial", icon: Wallet, module: "financial" as ModuleKey },
  { href: "/admin/invoices", label: "Invoices", icon: Receipt, module: "invoices" as ModuleKey },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, module: "payments" as ModuleKey },
  { href: "/admin/roles", label: "Roles", icon: Shield, module: "roles" as ModuleKey },
  { href: "/admin/shipping", label: "Shipping", icon: Truck, module: "shipping" as ModuleKey },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText, module: "audit" as ModuleKey },
  { href: "/admin/settings", label: "Settings", icon: Settings, module: "settings" as ModuleKey },
];

export function AdminShell({ role, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-cb-border bg-cb-surface-2/90 px-4 py-6 backdrop-blur-md lg:min-h-screen">
          <div className="mb-8 rounded-2xl border border-cb-border bg-cb-surface p-4 shadow-sm cb-shadow-editorial">
            <div className="flex items-center gap-2">
              <LogoMark className="h-9 w-9 text-cb-brand-logo" title="Cookie Bite" />
              <p className="font-playful text-2xl leading-none text-cb-brand-logo">
                Cookie Bite
              </p>
            </div>
            <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-cb-text-muted">
              ADMIN CONSOLE
            </p>
            <span className="mt-3 inline-flex rounded-full border border-cb-border-strong bg-cb-peach/50 px-3 py-1 text-xs font-bold text-cb-text-strong">
              {getRoleLabel(role)}
            </span>
          </div>

          <nav className="space-y-1" aria-label="Admin navigation">
            {navItems
              .filter((item) => canAccess(role, item.module))
              .map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-200",
                      active
                        ? "bg-cb-terracotta-dark text-cb-cream-2 shadow-[var(--shadow-hover)]"
                        : "text-cb-text-strong hover:bg-cb-hover-overlay",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 h-16 border-b border-cb-border bg-cb-surface/85 px-4 backdrop-blur-md sm:px-6">
            <div className="flex h-full items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-serif text-lg font-bold text-cb-text-strong sm:text-xl">
                  Cookie Bite Admin & Owner Dashboard
                </p>
                <p className="truncate text-xs text-cb-text-muted">
                  Full operational control center
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-cb-border bg-cb-surface-elevated p-2 text-cb-text-strong transition-colors hover:bg-cb-hover-overlay"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" aria-hidden />
                </button>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-9 w-9 ring-1 ring-cb-border-strong",
                    },
                  }}
                />
              </div>
            </div>
          </header>

          <main className="border-t border-transparent px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
