import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getDevicesBreakdown, getOverview, getReferrersBreakdown, getTopPages } from "@/lib/tracking-server/queries";
import type { Range } from "@/lib/tracking-server/queries";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }

  const url = new URL(req.url);
  const range = (url.searchParams.get("range") as Range) || "7d";
  const validRanges: Range[] = ["24h", "7d", "30d", "90d"];
  const safe: Range = validRanges.includes(range) ? range : "7d";

  const [overview, pages, devices, referrers] = await Promise.all([
    getOverview(safe),
    getTopPages(safe, 15),
    getDevicesBreakdown(safe),
    getReferrersBreakdown(safe),
  ]);

  return Response.json({ ok: true, overview, pages, devices, referrers });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
