import { auth } from "@/lib/auth/supabase-auth";
import { z } from "zod";
import { getUserBySupabaseId } from "@/lib/db/users";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EventSchema = z
  .object({
    product_id: z.string().uuid().optional(),
    product_slug: z.string().min(1).max(180).optional(),
    event_type: z.enum(["view", "add_to_cart", "purchase", "wishlist"]),
    session_id: z.string().max(120).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => Boolean(d.product_id ?? d.product_slug), {
    message: "product_id or product_slug required",
  });

/**
 * Track storefront behavior for the recommendation engine.
 * Public (guests allowed) — user_id is set when Clerk session exists.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = EventSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  let product_id = parsed.data.product_id ?? null;
  if (!product_id && parsed.data.product_slug) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", parsed.data.product_slug)
      .eq("is_active", true)
      .maybeSingle();
    product_id = data?.id ?? null;
  }
  if (!product_id) {
    return Response.json({ ok: false, error: "Product not found" }, { status: 404 });
  }

  const { userId } = await auth();
  let user_id: string | null = null;
  if (userId) {
    const profile = await getUserBySupabaseId(userId);
    user_id = profile?.id ?? null;
  }

  const { error } = await supabase.from("user_events").insert({
    user_id,
    session_id: parsed.data.session_id ?? null,
    event_type: parsed.data.event_type,
    product_id,
    metadata: parsed.data.metadata ?? {},
  });

  if (error) {
    console.error("/api/events insert", error);
    return Response.json({ ok: false, error: "Could not track event" }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export const dynamic = "force-dynamic";
