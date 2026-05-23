import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getRecordingFrames } from "@/lib/tracking-server/recordings";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ session: string }> },
): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const { session } = await ctx.params;
  const frames = await getRecordingFrames(session);
  return Response.json({ ok: true, session_id: session, frames });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
