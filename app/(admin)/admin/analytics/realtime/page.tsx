import { requireAdminAccess } from "@/lib/admin/require-admin";
import { RealtimeFeed } from "@/components/admin/tracking/RealtimeFeed";
import { AdminPresencePanel } from "@/components/admin/tracking/AdminPresencePanel";
import { VisitorPresencePanel } from "@/components/admin/tracking/VisitorPresencePanel";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";

export default async function AdminAnalyticsRealtimePage() {
  await requireAdminAccess("analytics");
  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsRealtime.title"
        subtitleKey="adminPages.analyticsRealtime.subtitle"
      />
      <AdminPresencePanel />
      <VisitorPresencePanel />
      <RealtimeFeed />
    </div>
  );
}

export const dynamic = "force-dynamic";
