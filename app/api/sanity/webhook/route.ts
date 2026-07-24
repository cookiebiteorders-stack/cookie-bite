import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const productWebhookSchema = z.object({
  _type: z.string(),
  _id: z.string().min(1),
  slug: z.object({ current: z.string().min(1).max(200) }).optional(),
  title_en: z.string().max(200).nullable().optional(),
  title_ar: z.string().max(200).nullable().optional(),
  description_en: z.string().max(5000).nullable().optional(),
  description_ar: z.string().max(5000).nullable().optional(),
  price: z.number().finite().nonnegative().optional(),
  compare_price: z.number().finite().nonnegative().nullable().optional(),
  stock_count: z.number().finite().optional(),
  is_active: z.boolean().optional(),
  badges: z.array(z.string()).optional(),
  dietary: z.array(z.string()).optional(),
  seasons: z.array(z.string()).optional(),
});

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

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = productWebhookSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const payload = parsed.data;

  if (payload._type !== "product") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const slug = payload.slug?.current;
  if (!slug) return new Response("Missing slug", { status: 400 });

  const supabase = createSupabaseAdminClient();
  await supabase.from("products").upsert(
    {
      sanity_id: payload._id,
      slug,
      name: payload.title_en ?? payload.title_ar ?? slug,
      title_en: payload.title_en ?? null,
      title_ar: payload.title_ar ?? null,
      description_en: payload.description_en ?? null,
      description_ar: payload.description_ar ?? null,
      price_egp: payload.price ?? 0,
      compare_price_egp: payload.compare_price ?? null,
      stock: payload.stock_count ?? 0,
      is_active: payload.is_active !== false,
      badges: payload.badges ?? [],
      dietary: payload.dietary ?? [],
      seasons: payload.seasons ?? [],
    },
    { onConflict: "sanity_id" },
  );

  return NextResponse.json({ ok: true, synced: true });
}
