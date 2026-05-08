import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing SANITY_WEBHOOK_SECRET", { status: 500 });

  const signature = req.headers.get("sanity-webhook-signature") ?? "";
  const rawBody = await req.text();
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  if (!safeEqual(signature, expected)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const type = String(payload._type ?? "");
  if (type !== "product") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const slugObj = payload.slug as { current?: string } | undefined;
  const slug = slugObj?.current;
  if (!slug) return new Response("Missing slug", { status: 400 });

  const supabase = createSupabaseAdminClient();
  await supabase.from("products").upsert(
    {
      sanity_id: String(payload._id ?? ""),
      slug,
      name: String(payload.title_en ?? payload.title_ar ?? slug),
      title_en: payload.title_en ?? null,
      title_ar: payload.title_ar ?? null,
      description_en: payload.description_en ?? null,
      description_ar: payload.description_ar ?? null,
      price_egp: Number(payload.price ?? 0),
      compare_price_egp: payload.compare_price ? Number(payload.compare_price) : null,
      stock: Number(payload.stock_count ?? 0),
      is_active: payload.is_active !== false,
      badges: Array.isArray(payload.badges) ? payload.badges : [],
      dietary: Array.isArray(payload.dietary) ? payload.dietary : [],
      seasons: Array.isArray(payload.seasons) ? payload.seasons : [],
    },
    { onConflict: "sanity_id" },
  );

  return NextResponse.json({ ok: true, synced: true });
}
