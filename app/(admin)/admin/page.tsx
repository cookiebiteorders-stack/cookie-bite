import Link from "next/link";
import { roleMatrix, type ModuleKey, type UserRole } from "@/lib/admin/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const quickActions = [
  "Add New Product",
  "View Pending Orders",
  "Send Promotion",
  "Upload Media",
  "Open Audit Log",
];

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

const moduleName: Record<ModuleKey, string> = {
  dashboard: "Dashboard Overview",
  products: "Product Management",
  addons: "Add-ons Management",
  orders: "Order Management",
  customers: "Customer Management",
  discounts: "Discounts & Promotions",
  media: "Media Library",
  cms: "CMS",
  templates: "HTML templates & tools",
  analytics: "Analytics",
  financial: "Financial Reports",
  invoices: "Invoice Management",
  shipping: "Shipping & Delivery",
  payments: "Payment Config",
  roles: "Role Management",
  settings: "System Settings",
  audit: "Audit Logs",
};

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

export default async function AdminHomePage() {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: ordersToday = 0 },
    { count: activeOrders = 0 },
    { count: totalCustomers = 0 },
    { count: totalProducts = 0 },
    { data: revenueRows = [] },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing", "shipped"]),
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("total_egp"),
  ]);

  const revenueData = revenueRows ?? [];
  const totalRevenue = revenueData.reduce(
    (sum, row) => sum + Number((row as { total_egp?: number }).total_egp ?? 0),
    0,
  );
  const aov = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

  const liveKpis = [
    { title: "Total Revenue", value: `EGP ${Math.round(totalRevenue).toLocaleString()}`, trend: "Live", tone: "success" },
    { title: "Orders Today", value: String(ordersToday), trend: "Live", tone: "info" },
    { title: "Active Orders", value: String(activeOrders), trend: "Live", tone: "warning" },
    { title: "Customers", value: String(totalCustomers), trend: "Live", tone: "success" },
    { title: "Products", value: String(totalProducts), trend: "Live", tone: "info" },
    { title: "Avg Order Value", value: `EGP ${Math.round(aov).toLocaleString()}`, trend: "Live", tone: "success" },
  ];

  return (
    <div className="space-y-6">
      <section className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Dashboard Overview
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">
          Owner/Admin control center scaffolded from your full blueprint. This is the Phase 1
          foundation: role model, KPI surface, quick actions, and permission architecture ready for API
          binding.
        </p>
      </section>

      <section className="admin-panel-surface rounded-2xl border border-cb-border p-5">
        <h2 className="font-serif text-xl font-bold text-cb-text-strong">Commerce intelligence</h2>
        <p className="mt-2 text-sm text-cb-text-muted">
          لوحة التحليلات المتقدّمة والرسوم البيانية متوفرة في Reports — يتم ربط المزيد من الـ BI هنا لاحقاً.
        </p>
        <Link
          href="/admin/reports"
          className="mt-4 inline-flex rounded-xl bg-cb-terracotta-dark px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110"
        >
          فتح Reports &amp; BI
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveKpis.map((kpi) => (
          <article
            key={kpi.title}
            className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-[var(--shadow-card)] cb-shadow-editorial"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">
              {kpi.title}
            </p>
            <p className="mt-2 text-2xl font-bold text-cb-text-strong">{kpi.value}</p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                badgeClass[kpi.tone]
              }`}
            >
              {kpi.trend}
            </span>
          </article>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
          <h2 className="font-serif text-2xl font-bold text-cb-text-strong">
            Role Permission Matrix
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-cb-border text-left text-cb-text-muted">
                  <th className="py-2 pr-4">Module</th>
                  {roles.map((role) => (
                    <th key={role} className="py-2 pr-4 uppercase">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moduleOrder.map((module) => (
                  <tr key={module} className="border-b border-cb-border">
                    <td className="py-2 pr-4 font-semibold text-cb-text">
                      {moduleName[module]}
                    </td>
                    {roles.map((role) => (
                      <td key={`${module}-${role}`} className="py-2 pr-4">
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

        <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
          <h2 className="font-serif text-2xl font-bold text-cb-text-strong">
            Quick Actions
          </h2>
          <ul className="mt-4 space-y-2">
            {quickActions.map((action) => (
              <li key={action}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-cb-border bg-cb-peach/35 px-4 py-2 text-left text-sm font-semibold text-cb-text-strong transition-colors hover:bg-cb-hover-overlay"
                >
                  {action}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl border border-dashed border-cb-border bg-cb-surface-2 p-3 text-xs text-cb-text-muted">
            KPIs are now loaded from live Supabase data and refresh on each request.
          </div>
        </article>
      </section>
    </div>
  );
}

