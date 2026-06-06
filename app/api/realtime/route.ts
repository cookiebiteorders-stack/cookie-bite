import { requireAdminAccess } from "@/lib/admin/require-admin";
import { readRealtimeUsers } from "@/lib/tracking-server/ingest";
import {
  enrichRealtimeVisitors,
  filterStorefrontVisitors,
} from "@/lib/tracking-server/realtime-enrich";

export async function GET(req: Request): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const url = new URL(req.url);
  const windowSeconds = Math.min(
    1800,
    Math.max(30, Number(url.searchParams.get("window") ?? 300)),
  );
  const data = await readRealtimeUsers(windowSeconds);
  const storefrontVisitors = filterStorefrontVisitors(data.visitors);
  const enriched = await enrichRealtimeVisitors(storefrontVisitors);
  enriched.sort((a, b) => b.last_event_at - a.last_event_at);

  const byPath = new Map<string, number>();
  const byDevice = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const v of enriched) {
    const path = v.path ?? "/";
    const device = v.device_type ?? "unknown";
    byPath.set(path, (byPath.get(path) ?? 0) + 1);
    byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
    byType.set(v.visitor_type, (byType.get(v.visitor_type) ?? 0) + 1);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      window_seconds: windowSeconds,
      active_users: enriched.length,
      guest_count: byType.get("guest") ?? 0,
      customer_count: byType.get("customer") ?? 0,
      top_paths: Array.from(byPath.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      devices: Array.from(byDevice.entries()).map(([name, value]) => ({ name, value })),
      visitors: enriched.slice(0, 100),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
