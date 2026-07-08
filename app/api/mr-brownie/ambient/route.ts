import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getAiProductNamePool } from "@/lib/ai/website-knowledge";
import { buildAmbientApiMessage } from "@/lib/mr-brownie/ambient-api-messages";
import { getFreeShippingThresholdEgp } from "@/lib/store/commerce-settings-server";

const bodySchema = z.object({
  cartItems: z.number().int().min(0).max(200).optional(),
  cartSubtotalEgp: z.number().min(0).max(1_000_000).optional(),
  locale: z.enum(["ar", "en"]).optional(),
  pdpDwellSeconds: z.number().int().min(0).max(3600).optional(),
  productSlug: z.string().max(120).optional(),
  productName: z.string().max(200).optional(),
  cartIdleMinutes: z.number().int().min(0).max(10080).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    const cartItems = parsed.success ? (parsed.data.cartItems ?? 0) : 0;
    const cartSubtotal = parsed.success ? (parsed.data.cartSubtotalEgp ?? 0) : 0;
    const locale = parsed.success && parsed.data.locale === "en" ? "en" : "ar";

    const supabaseClient = await createSupabaseServerClient();
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id;
    const userEmail = user?.email ?? null;

    const resolvedRole = userId
      ? await resolveStaffRole({
          email: userEmail,
          supabaseUserId: userId,
        })
      : "guest";

    const liveNames = await getAiProductNamePool(8);
    const freeShippingThresholdEgp = await getFreeShippingThresholdEgp();

    return NextResponse.json({
      message: buildAmbientApiMessage({
        locale,
        resolvedRole,
        cartItems,
        cartSubtotal,
        productNames: liveNames,
        freeShippingThresholdEgp,
        pdpDwellSeconds: parsed.success ? parsed.data.pdpDwellSeconds : undefined,
        productSlug: parsed.success ? parsed.data.productSlug : undefined,
        productName: parsed.success ? parsed.data.productName : undefined,
        cartIdleMinutes: parsed.success ? parsed.data.cartIdleMinutes : undefined,
      }),
      meta: { role: resolvedRole },
    });
  } catch (error) {
    console.error("ambient-message error", error);
    return NextResponse.json(
      { error: { en: "Could not generate ambient message.", ar: "تعذر إنشاء رسالة حالية." } },
      { status: 500 },
    );
  }
}
