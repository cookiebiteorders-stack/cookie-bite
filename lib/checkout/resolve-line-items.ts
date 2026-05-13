import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ResolvedCheckoutLine = {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

type DbRow = {
  slug: string;
  name: string;
  title_en: string | null;
  price_egp: number;
  stock: number;
  is_active: boolean;
};

/**
 * يحل عناصر السلة من قاعدة البيانات (لا تثق بأسعار العميل).
 * `items[].id` يجب أن يكون **slug المنتج** كما في السلة الموحّدة.
 */
export async function resolveCheckoutLineItems(
  items: { id: string; quantity: number }[],
): Promise<
  | { ok: true; lines: ResolvedCheckoutLine[]; subtotal: number }
  | { ok: false; error: string; status: number }
> {
  if (!items.length) {
    return { ok: false, error: "No items", status: 400 };
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { ok: false, error: "Server misconfigured", status: 500 };
  }

  const supabase = createSupabaseAdminClient();
  const slugs = [...new Set(items.map((i) => i.id))];

  const { data, error } = await supabase
    .from("products")
    .select("slug, name, title_en, price_egp, stock, is_active")
    .in("slug", slugs);

  if (error) {
    console.error("resolveCheckoutLineItems", error);
    return { ok: false, error: "Database error", status: 500 };
  }

  const map = new Map((data as DbRow[] | null)?.map((r) => [r.slug, r]) ?? []);
  const lines: ResolvedCheckoutLine[] = [];
  let subtotal = 0;

  for (const item of items) {
    const p = map.get(item.id);
    if (!p) {
      return { ok: false, error: `Unknown product: ${item.id}`, status: 400 };
    }
    if (!p.is_active) {
      return { ok: false, error: `Product unavailable: ${item.id}`, status: 400 };
    }
    const stock = Number(p.stock ?? 0);
    if (stock < item.quantity) {
      return {
        ok: false,
        error: `Insufficient stock for ${item.id}`,
        status: 400,
      };
    }
    const name = (p.title_en?.trim() || p.name || p.slug).trim();
    const unitPrice = Number(p.price_egp);
    lines.push({
      id: p.slug,
      name,
      unitPrice,
      quantity: item.quantity,
    });
    subtotal += unitPrice * item.quantity;
  }

  return { ok: true, lines, subtotal };
}
