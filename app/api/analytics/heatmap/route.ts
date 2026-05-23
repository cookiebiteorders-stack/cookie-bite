import { requireAdminAccess } from "@/lib/admin/require-admin";
import { getHeatmapForPath } from "@/lib/tracking-server/queries";

const VALID_DEVICES = new Set(["desktop", "tablet", "mobile"]);

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";
  const deviceParam = (url.searchParams.get("device") || "desktop").toLowerCase();
  const device = VALID_DEVICES.has(deviceParam) ? deviceParam : "desktop";

  const grid = await getHeatmapForPath(path, device);
  const total = grid.reduce((acc, cell) => acc + Number(cell.clicks ?? 0), 0);
  return Response.json({
    ok: true,
    path,
    device,
    grid_size: 50,
    total_clicks: total,
    cells: grid,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
