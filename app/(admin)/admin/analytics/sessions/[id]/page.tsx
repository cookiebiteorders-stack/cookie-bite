import Link from "next/link";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getSessionDetail } from "@/lib/tracking-server/queries";
import { SessionDetailView } from "@/components/admin/tracking/session-detail-view";

export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminAccess("analytics");
  const { id } = await params;
  const detail = await getSessionDetail(id);

  if (!detail) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-bold text-cb-text-strong">Session not found</h1>
        <Link
          href="/admin/analytics/sessions"
          className="inline-flex rounded-xl bg-cb-surface-2 px-4 py-2 text-sm font-semibold"
        >
          ← Back to sessions
        </Link>
      </div>
    );
  }

  return <SessionDetailView detail={detail} />;
}

export const dynamic = "force-dynamic";
