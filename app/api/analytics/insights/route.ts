import { requireAdminAccess } from "@/lib/admin/require-admin";
import { generateInsights } from "@/lib/tracking-server/insights";
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
  const valid: Range[] = ["24h", "7d", "30d", "90d"];
  const safe: Range = valid.includes(range) ? range : "7d";

  const insights = await generateInsights(safe);
  return Response.json({ ok: true, insights });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
