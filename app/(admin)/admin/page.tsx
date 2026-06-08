import { AdminDashboardHome } from "@/components/admin/admin-dashboard-home";
import { loadAdminDashboardKpis } from "@/lib/admin/dashboard-kpis";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const kpis = await loadAdminDashboardKpis();

  return (
    <AdminDashboardHome
      initialKpis={kpis}
    />
  );
}
