import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getRecentSessionsEnriched } from "@/lib/tracking-server/queries";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { SessionsListTable } from "@/components/admin/tracking/sessions-list-table";

export default async function AdminSessionsPage() {
  await requireAdminAccess("analytics");
  const sessions = await getRecentSessionsEnriched(100);

  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsSessions.title"
        subtitleKey="adminPages.analyticsSessions.subtitle"
      />
      <SessionsListTable sessions={sessions} />
    </div>
  );
}

export const dynamic = "force-dynamic";
