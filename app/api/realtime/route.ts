import { requireAdminAccess } from "@/lib/admin/require-admin";
import { readRealtimeUsers } from "@/lib/tracking-server/ingest";

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

  const byPath = new Map<string, number>();
  const byDevice = new Map<string, number>();
  for (const v of data.visitors) {
    const path = v.path ?? "/";
    const device = v.device_type ?? "unknown";
    byPath.set(path, (byPath.get(path) ?? 0) + 1);
    byDevice.set(device, (byDevice.get(device) ?? 0) + 1);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      window_seconds: windowSeconds,
      active_users: data.count,
      top_paths: Array.from(byPath.entries())
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      devices: Array.from(byDevice.entries()).map(([name, value]) => ({ name, value })),
      visitors: data.visitors.slice(0, 100),
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
