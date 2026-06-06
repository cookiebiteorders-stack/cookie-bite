import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

function shareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: rows, error: listErr } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", profile.id);

  if (listErr) {
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), {
      status: 500,
    });
  }

  const productIds = (rows ?? []).map((r) => r.product_id as string).filter(Boolean);
  if (productIds.length === 0) {
    return NextResponse.json(
      bilingualError("Wishlist is empty", "قائمة الرغبات فارغة"),
      { status: 400 },
    );
  }

  const token = shareToken();
  const { error: insertErr } = await supabase.from("wishlist_shares").insert({
    user_id: profile.id,
    share_token: token,
    title: null,
    product_ids: productIds,
  });

  if (insertErr) {
    console.error("wishlist_shares insert", insertErr);
    return NextResponse.json(
      bilingualError("Failed to create share link", "فشل إنشاء رابط المشاركة"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, token });
}
