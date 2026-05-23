import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { ReplayPlayer } from "@/components/admin/tracking/ReplayPlayer";

export default async function AdminRecordingPlayerPage({
  params,
}: {
  params: Promise<{ session: string }>;
}) {
  await requireAdminAccess("analytics");
  const { session } = await params;

  return (
    <div className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5 shadow-[var(--shadow-card)] cb-shadow-editorial">
        <Link
          href="/admin/analytics/recordings"
          className="text-xs font-semibold text-cb-text-muted hover:underline"
        >
          ← All recordings
        </Link>
        <h1 className="mt-2 font-serif text-2xl font-bold text-cb-text-strong">
          Session replay
        </h1>
        <p className="mt-1 font-mono text-xs text-cb-text-muted">{session}</p>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
        <ReplayPlayer sessionId={session} />
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
