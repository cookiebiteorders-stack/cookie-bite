import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  attachLinkedAddonsToRows,
  buildAddonsByProductId,
} from "@/lib/storefront/enrich-catalog-addons";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
} as const;

/** خريطة product UUID → إضافات مربوطة (للبطاقات بعد جلب الكتالوج). */
export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("is_active", true);

    if (error) {
      console.error("/api/products/linked-addons", error);
      return NextResponse.json(
        { error: { en: "Database error", ar: "خطأ في قاعدة البيانات" } },
        { status: 500 },
      );
    }

    const ids = (data ?? []).map((r) => String(r.id));
    const byProduct = await buildAddonsByProductId(ids);
    const rows = attachLinkedAddonsToRows(ids.map((id) => ({ id })), byProduct);

    const by_product_id: Record<string, (typeof rows)[0]["linked_addons"]> = {};
    for (const row of rows) {
      if (row.linked_addons.length > 0) {
        by_product_id[row.id] = row.linked_addons;
      }
    }

    return NextResponse.json({ by_product_id }, { headers: CACHE_HEADERS });
  } catch (e) {
    console.error("/api/products/linked-addons", e);
    return NextResponse.json(
      { error: { en: "Server error", ar: "خطأ في الخادم" } },
      { status: 500 },
    );
  }
}
