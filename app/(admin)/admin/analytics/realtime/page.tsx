import { requireAdminAccess } from "@/lib/admin/require-admin";
import { RealtimeFeed } from "@/components/admin/tracking/RealtimeFeed";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";

export default async function AdminAnalyticsRealtimePage() {
  await requireAdminAccess("analytics");
  return (
    <div className="space-y-5">
      <AdminPageIntro
        titleKey="adminPages.analyticsRealtime.title"
        subtitleKey="adminPages.analyticsRealtime.subtitle"
      />
      <RealtimeFeed />
    </div>
  );
}

export const dynamic = "force-dynamic";
