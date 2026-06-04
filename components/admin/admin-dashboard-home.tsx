"use client";

import Link from "next/link";
import { roleMatrix, type ModuleKey, type UserRole } from "@/lib/admin/rbac";
import { useLanguage } from "@/components/providers/language-provider";
import { formatAdminMoney } from "@/lib/admin/admin-label";

const moduleOrder: ModuleKey[] = [
  "dashboard",
  "products",
  "addons",
  "orders",
  "customers",
  "discounts",
  "media",
  "cms",
  "templates",
  "analytics",
  "financial",
  "invoices",
  "shipping",
  "payments",
  "roles",
  "settings",
  "audit",
];

const roles: UserRole[] = ["owner", "admin", "staff", "customer"];

const badgeClass: Record<string, string> = {
  success:
    "bg-[color-mix(in_oklab,var(--cb-success)_14%,transparent)] text-[var(--cb-success)]",
  warning:
    "bg-[color-mix(in_oklab,var(--cb-warning)_16%,transparent)] text-[var(--cb-warning)]",
  danger:
    "bg-[color-mix(in_oklab,var(--cb-danger)_14%,transparent)] text-[var(--cb-danger)]",
  info: "bg-[color-mix(in_oklab,var(--cb-info)_14%,transparent)] text-[var(--cb-info)]",
};

type Kpi = {
  titleKey: string;
  value: string;
  tone: string;
};

type Props = {
  totalRevenue: number;
  ordersToday: number;
  activeOrders: number;
  totalCustomers: number;
  totalProducts: number;
  aov: number;
};

export function AdminDashboardHome({
  totalRevenue,
  ordersToday,
  activeOrders,
  totalCustomers,
  totalProducts,
  aov,
}: Props) {
  const { t, lang } = useLanguage();

  const liveKpis: Kpi[] = [
    {
      titleKey: "adminDashboard.kpiTotalRevenue",
      value: formatAdminMoney(totalRevenue, lang),
      tone: "success",
    },
    {
      titleKey: "adminDashboard.kpiOrdersToday",
      value: String(ordersToday),
      tone: "info",
    },
    {
      titleKey: "adminDashboard.kpiActiveOrders",
      value: String(activeOrders),
      tone: "warning",
    },
    {
      titleKey: "adminDashboard.kpiCustomers",
      value: String(totalCustomers),
      tone: "success",
    },
    {
      titleKey: "adminDashboard.kpiProducts",
      value: String(totalProducts),
      tone: "info",
    },
    {
      titleKey: "adminDashboard.kpiAov",
      value: formatAdminMoney(aov, lang),
      tone: "success",
    },
  ];

  const quickActionKeys = [
    "adminDashboard.quickAddProduct",
    "adminDashboard.quickPendingOrders",
    "adminDashboard.quickPromotion",
    "adminDashboard.quickUploadMedia",
    "adminDashboard.quickAuditLog",
  ] as const;

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <section className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          {t("adminDashboard.title")}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">{t("adminDashboard.subtitle")}</p>
      </section>

      <section className="admin-panel-surface rounded-2xl border border-cb-border p-5">
        <h2 className="font-serif text-xl font-bold text-cb-text-strong">
          {t("adminDashboard.commerceTitle")}
        </h2>
        <p className="mt-2 text-sm text-cb-text-muted">{t("adminDashboard.commerceBody")}</p>
        <Link
          href="/admin/reports"
          className="mt-4 inline-flex rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110"
        >
          {t("adminDashboard.commerceCta")}
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveKpis.map((kpi) => (
          <article
            key={kpi.titleKey}
            className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-[var(--shadow-card)] cb-shadow-editorial"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
              {t(kpi.titleKey)}
            </p>
            <p className="mt-2 text-2xl font-bold text-cb-text-strong">{kpi.value}</p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                badgeClass[kpi.tone]
              }`}
            >
              {t("adminStatus.live")}
            </span>
          </article>
        ))}
      </section>

      <div className="admin-split-grid flex w-full min-w-0 max-w-full flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="min-w-0 w-full max-w-full overflow-x-clip rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
          <h2 className="font-serif text-2xl font-bold text-cb-text-strong">
            {t("adminDashboard.matrixTitle")}
          </h2>
          <div className="admin-table-scroll mt-4">
            <p className="mb-2 text-xs text-cb-text-muted lg:hidden">
              {t("adminDashboard.matrixScrollHint")}
            </p>
            <table className="min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-cb-border text-start text-cb-text-muted">
                  <th className="py-2 pe-4">{t("adminDashboard.matrixModule")}</th>
                  {roles.map((role) => (
                    <th key={role} className="py-2 pe-4 uppercase">
                      {t(`adminRoles.${role}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduleOrder.map((module) => (
                  <tr key={module} className="border-b border-cb-border">
                    <td className="py-2 pe-4 font-semibold text-cb-text">
                      {t(`adminDashboard.modules.${module}`)}
                    </td>
                    {roles.map((role) => (
                      <td key={`${module}-${role}`} className="py-2 pe-4">
                        <span className="inline-flex rounded-full bg-cb-surface-2 px-2 py-0.5 text-xs font-semibold text-cb-text-strong">
                          {roleMatrix[role][module]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="min-w-0 w-full max-w-full shrink-0 rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
          <h2 className="font-serif text-2xl font-bold text-cb-text-strong">
            {t("adminDashboard.quickActionsTitle")}
          </h2>
          <ul className="mt-4 w-full min-w-0 max-w-full space-y-2">
            {quickActionKeys.map((key) => (
              <li key={key} className="min-w-0 max-w-full">
                <button
                  type="button"
                  className="box-border w-full max-w-full rounded-xl border border-cb-border bg-cb-peach/35 px-4 py-2 text-start text-sm font-semibold text-cb-text-strong transition-colors hover:bg-cb-hover-overlay"
                >
                  {t(key)}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 box-border w-full max-w-full rounded-xl border border-dashed border-cb-border bg-cb-surface-2 p-3 text-xs text-cb-text-muted">
            {t("adminDashboard.liveNote")}
          </div>
        </article>
      </div>
    </div>
  );
}
