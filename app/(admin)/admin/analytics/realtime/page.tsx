import { requireAdminAccess } from "@/lib/admin/require-admin";
import { RealtimeFeed } from "@/components/admin/tracking/RealtimeFeed";

export default async function AdminAnalyticsRealtimePage() {
  await requireAdminAccess("analytics");
  return (
    <div className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">Realtime users</h1>
        <p className="mt-2 max-w-3xl text-sm text-cb-text-muted">
          Live visitor count, top pages, and devices in the last 5 minutes. Polls every 10 seconds.
        </p>
      </header>
      <RealtimeFeed />
    </div>
  );
}

export const dynamic = "force-dynamic";
