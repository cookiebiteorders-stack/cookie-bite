import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getSessionDetail } from "@/lib/tracking-server/queries";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const { id } = await ctx.params;
  const detail = await getSessionDetail(id);
  if (!detail) {
    return Response.json({ ok: false, error: "Session not found" }, { status: 404 });
  }
  return Response.json({ ok: true, ...detail });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
