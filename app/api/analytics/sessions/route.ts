import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getRecentSessions } from "@/lib/tracking-server/queries";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const sessions = await getRecentSessions(limit);
  return Response.json({ ok: true, sessions });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
