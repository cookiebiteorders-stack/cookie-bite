import { requireAdminAccess } from "@/lib/admin/require-admin";
import { computeFunnel } from "@/lib/tracking-server/funnels";
import type { Range } from "@/lib/tracking-server/queries";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  try {
    await requireAdminAccess("analytics");
  } catch (response) {
    if (response instanceof Response) return response;
    throw response;
  }
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const range = (url.searchParams.get("range") as Range) || "30d";
  const valid: Range[] = ["24h", "7d", "30d", "90d"];
  const safeRange: Range = valid.includes(range) ? range : "30d";

  const result = await computeFunnel(slug, safeRange);
  if (!result) {
    return Response.json({ ok: false, error: "Funnel not found" }, { status: 404 });
  }
  return Response.json({ ok: true, ...result });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
