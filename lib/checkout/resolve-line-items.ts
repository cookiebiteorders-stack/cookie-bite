import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CartSelectedAddon } from "@/lib/addons/types";
import { addonsFromProductAddonJoinRows, dedupeCartSelectedAddons } from "@/lib/addons/dedupe";
import type { Addon } from "@/lib/addons/types";

export type ResolvedCheckoutLine = {
  id: string;
  name: string;
  baseUnitPrice: number;
  addonsTotalUnitPrice: number;
  finalUnitPrice: number;
  quantity: number;
  selectedAddons: CartSelectedAddon[];
};

type DbRow = {
  id: string;
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
  items: { id: string; quantity: number; addons?: CartSelectedAddon[] }[],
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
    .select("id, slug, name, title_en, price_egp, stock, is_active")
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
    const baseUnitPrice = Number(p.price_egp);
    const selectedAddons = dedupeCartSelectedAddons(item.addons ?? []);
    let addonsTotalUnitPrice = 0;
    if (selectedAddons.length > 0) {
      const { data: links } = await supabase
        .from("product_addons")
        .select("addons(*)")
        .eq("product_id", p.id)
        .returns<Array<{ addons?: Addon | Addon[] | null }>>();
      const linkedAddons = addonsFromProductAddonJoinRows(links ?? []);
      const linkedMap = new Map(linkedAddons.map((a) => [a.id, a]));
      for (const addonSel of selectedAddons) {
        const linked = linkedMap.get(addonSel.addon_id);
        if (!linked) {
          return { ok: false, error: "Invalid add-on selection", status: 400 };
        }
        for (const optSel of addonSel.options) {
          const option = linked.options.find((o) => o.id === optSel.option_id);
          if (!option) return { ok: false, error: "Invalid add-on option", status: 400 };
          if (option.quantity_limit != null && optSel.quantity > option.quantity_limit) {
            return { ok: false, error: "Add-on quantity limit exceeded", status: 400 };
          }
          addonsTotalUnitPrice += Number(option.price) * optSel.quantity;
        }
      }
      for (const linked of linkedAddons) {
        if (!linked.required) continue;
        const picked = selectedAddons.find((s) => s.addon_id === linked.id);
        if (!picked || picked.options.length === 0) {
          return { ok: false, error: `Required add-on missing: ${linked.name}`, status: 400 };
        }
      }
    }
    const finalUnitPrice = baseUnitPrice + addonsTotalUnitPrice;
    lines.push({
      id: p.slug,
      name,
      baseUnitPrice,
      addonsTotalUnitPrice,
      finalUnitPrice,
      quantity: item.quantity,
      selectedAddons,
    });
    subtotal += finalUnitPrice * item.quantity;
  }

  return { ok: true, lines, subtotal };
}
