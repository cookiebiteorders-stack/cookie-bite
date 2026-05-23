import { requireAdminAccess } from "@/lib/admin/require-admin";
import { listRecordings } from "@/lib/tracking-server/recordings";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30)));
  const recordings = await listRecordings(limit);
  return Response.json({ ok: true, recordings });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
