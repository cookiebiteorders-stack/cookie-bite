import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

const createSchema = z.object({
  product_id: z.string().uuid(),
});

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select(
      "id, created_at, product:products(id,slug,name,title_en,title_ar,price_egp,image_url,images,is_active)",
    )
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("wishlists")
    .upsert(
      { user_id: profile.id, product_id: parsed.data.product_id },
      { onConflict: "user_id,product_id" },
    );
  if (error) {
    return NextResponse.json(
      bilingualError("Failed to save wishlist", "فشل حفظ قائمة الرغبات"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
