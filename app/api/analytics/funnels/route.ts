import { requireAdminAccess } from "@/lib/admin/require-admin";
import { listFunnels } from "@/lib/tracking-server/funnels";

export async function GET(): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const funnels = await listFunnels();
  return Response.json({ ok: true, funnels });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
