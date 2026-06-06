"use client";

import Link from "next/link";
import { Package, Search } from "lucide-react";
import { AccountOrdersList, type AccountOrderRow } from "@/components/account/account-orders-list";
import { AccountSidebar } from "@/components/account/account-sidebar";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";

type Props = {
  userName: string;
  userEmail: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  showAdminLinks: boolean;
  adminConsoleLinks?: AdminConsoleNavItem[];
  orders: AccountOrderRow[];
  totalCount: number;
};

export function AccountOrdersPageClient({
  userName,
  userEmail,
  avatarUrl,
  roleLabel,
  showAdminLinks,
  adminConsoleLinks = [],
  orders,
  totalCount,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="bg-cb-cream pb-24 pt-8 dark:bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 cb-gutter lg:flex-row">
        <AccountSidebar
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          roleLabel={roleLabel}
          showAdminLinks={showAdminLinks}
          adminConsoleLinks={adminConsoleLinks}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <header className="rounded-3xl border border-cb-peach-deep/40 bg-gradient-to-br from-cb-surface via-cb-cream to-cb-peach/25 p-6 shadow-sm ring-1 ring-cb-border/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cb-terracotta-dark">
                  {t("accountOrders.pageEyebrow")}
                </p>
                <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-cb-text-strong md:text-4xl">
                  {t("accountOrders.pageTitle")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cb-text-muted">
                  {t("accountOrders.pageSubtitle")}
                </p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-cb-surface/80 px-3 py-1 text-xs font-semibold text-cb-text-strong ring-1 ring-cb-border/60">
                  <Package className="h-3.5 w-3.5 text-cb-terracotta-dark" aria-hidden />
                  {t("accountOrders.orderCount", { count: totalCount })}
                </p>
              </div>
              <Link
                href="/track"
                className={buttonClassName(
                  "outline",
                  "inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm",
                )}
              >
                <Search className="h-4 w-4" aria-hidden />
                {t("accountOrders.trackOrder")}
              </Link>
            </div>
          </header>

          <section className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border">
            <AccountOrdersList orders={orders} showDate detailed />
          </section>
        </div>
      </div>
    </div>
  );
}
