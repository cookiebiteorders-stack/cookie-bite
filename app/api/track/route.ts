import { TrackBatchSchema } from "@/lib/tracking-server/schema";
import { ingestBatch } from "@/lib/tracking-server/ingest";
import { readGeoContext, isUserAgentBot } from "@/lib/tracking-server/geo";
import { rateLimit } from "@/lib/tracking-server/rate-limit";

const MAX_BODY_BYTES = 64 * 1024;
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-tracking-token",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request): Promise<Response> {
  const token = req.headers.get("x-tracking-token");
  const expectedToken = process.env.TRACKING_TOKEN?.trim();
  if (expectedToken && token !== expectedToken) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const lengthHeader = req.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = TrackBatchSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(
      { ok: false, error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const geo = readGeoContext(req);
  const ua = req.headers.get("user-agent");
  const headerBot = isUserAgentBot(ua);

  const rlKey = parsed.data.visitor.visitor_id || geo.ip || "anonymous";
  const rl = await rateLimit(`track:${rlKey}`, { windowMs: 10_000, max: 60 });
  if (!rl.ok) {
    return jsonResponse(
      { ok: false, error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      },
    );
  }

  // Inject server-side detected bot flag into the device snapshot so it gets
  // saved with the visitor/session/events.
  const batch = {
    ...parsed.data,
    device: {
      ...parsed.data.device,
      is_bot: parsed.data.device.is_bot ?? headerBot,
    },
  };

  try {
    const summary = await ingestBatch(batch, { geo, receivedAt: new Date() });
    return jsonResponse({ ok: true, ...summary });
  } catch (e) {
    console.error("[/api/track] ingest failed", e);
    return jsonResponse({ ok: false, error: "Ingest failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
