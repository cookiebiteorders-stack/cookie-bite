/**
 * Write tools for Admin Copilot — create / update / delete against Supabase
 * with audit logging (mirrors /api/admin/* behaviour).
 */

import { revalidatePath } from "next/cache";
import { revalidateStorefrontCatalog } from "@/lib/storefront/revalidate-catalog";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { normalizeProductImages, primaryImageFromProduct } from "@/lib/products/media";
import { deriveProductSlug } from "@/lib/products/slug";
import { insertProductWithSlugRetry } from "@/lib/products/insert-product";
import { filterValidBadges, filterValidSeasons } from "@/lib/products/catalog-options";
import { roleMatrix, type UserRole } from "@/lib/admin/rbac";
import type { CopilotToolActor } from "@/lib/admin/copilot/tools";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(/[,،\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function canWrite(actor: CopilotToolActor): boolean {
  const role = actor.role as UserRole;
  if (role === "owner" || role === "admin") return true;
  const perm = roleMatrix[role]?.products;
  return perm === "full" || perm === "limited";
}

function defaultPrice(category?: string | null): number {
  const c = (category ?? "").toLowerCase();
  if (c.includes("box") || c.includes("gift") || c.includes("هد") || c.includes("بوكس")) return 450;
  if (c.includes("brownie") || c.includes("براون")) return 95;
  if (c.includes("premium") || c.includes("luxury") || c.includes("فاخ")) return 220;
  return 149;
}

function buildDefaultDescriptions(name: string) {
  return {
    description_en: `${name} — handcrafted in small batches with premium ingredients. Fresh-baked daily in New Cairo. Perfect for gifting or treating yourself.`,
    description_ar: `${name} — كوكيز يدوية الصنع بمكونات مختارة، تُخبز طازجة يومياً في القاهرة الجديدة. مثالية للهدايا والمناسبات.`,
  };
}

function marketingName(theme: string): string {
  const t = theme.trim();
  if (!t) return "Signature Cookie Box";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  if (/cookie|كوك|brownie|براون/i.test(t)) return cap;
  return `Luxury ${cap} Cookies`;
}

async function resolveProductId(
  args: Record<string, unknown>,
): Promise<{ id: string; name: string } | { warning: string }> {
  const sb = createSupabaseAdminClient();
  if (typeof args.product_id === "string" && args.product_id.trim()) {
    const { data } = await sb.from("products").select("id,name").eq("id", args.product_id.trim()).maybeSingle();
    if (data) return { id: data.id as string, name: (data.name as string) ?? "" };
    return { warning: "Product not found for that id." };
  }
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return { warning: "Provide product_id or query (name substring)." };
  const { data } = await sb
    .from("products")
    .select("id,name")
    .ilike("name", `%${query}%`)
    .limit(5);
  const rows = data ?? [];
  if (rows.length === 0) return { warning: `No product matching "${query}".` };
  if (rows.length > 1) {
    return {
      warning: `Multiple matches for "${query}": ${rows.map((r) => `${r.name} (${r.id})`).join(", ")}. Pass product_id.`,
    };
  }
  return { id: rows[0]!.id as string, name: (rows[0]!.name as string) ?? "" };
}

async function resolveOrderId(
  args: Record<string, unknown>,
): Promise<{ id: string } | { warning: string }> {
  const sb = createSupabaseAdminClient();
  if (typeof args.order_id === "string" && args.order_id.trim()) {
    const { data } = await sb.from("orders").select("id").eq("id", args.order_id.trim()).maybeSingle();
    if (data) return { id: data.id as string };
    return { warning: "Order not found." };
  }
  const orderNumber =
    typeof args.order_number === "string" || typeof args.order_number === "number"
      ? String(args.order_number).replace(/^#/, "").trim()
      : "";
  if (!orderNumber) return { warning: "Provide order_id or order_number." };
  const { data } = await sb.from("orders").select("id").eq("order_number", orderNumber).maybeSingle();
  if (!data) {
    const { data: byCode } = await sb
      .from("orders")
      .select("id")
      .ilike("order_code", `%${orderNumber}%`)
      .maybeSingle();
    if (byCode) return { id: byCode.id as string };
    return { warning: `Order #${orderNumber} not found.` };
  }
  return { id: data.id as string };
}

async function revalidateProductPaths(slug?: string | null) {
  try {
    await revalidateStorefrontCatalog();
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/api/products");
    if (slug) revalidatePath(`/shop/${slug}`);
  } catch {
    /* non-fatal */
  }
}

export async function create_product(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  if (!canWrite(actor)) {
    return { warning: "Only owner/admin can create products via copilot." };
  }
  try {
    const theme = typeof args.theme === "string" ? args.theme.trim() : "";
    let name = typeof args.name === "string" ? args.name.trim() : "";
    if (!name && theme) name = marketingName(theme);
    if (!name) return { warning: "name or theme is required." };

    const category =
      (typeof args.category === "string" ? args.category.trim() : null) ||
      (theme ? "Cookies" : "Cookies");
    const price_egp = args.price_egp != null ? num(args.price_egp) : defaultPrice(category);
    if (price_egp <= 0) return { warning: "price_egp must be positive." };

    const defaults = buildDefaultDescriptions(name);
    const description_en =
      (typeof args.description_en === "string" ? args.description_en.trim() : "") ||
      defaults.description_en;
    const description_ar =
      (typeof args.description_ar === "string" ? args.description_ar.trim() : "") ||
      defaults.description_ar;

    const badges = filterValidBadges(parseList(args.badges ?? args.tags));
    const seasons = filterValidSeasons(parseList(args.seasons));
    const stock = args.stock != null ? Math.max(0, Math.floor(num(args.stock))) : 24;
    const is_active = args.is_active !== false;

    const images = normalizeProductImages(undefined, null);
    const image_url = primaryImageFromProduct(images, null);

    const buildRow = (slug: string) => ({
      slug,
      name,
      title_en: (typeof args.title_en === "string" ? args.title_en.trim() : null) || name,
      title_ar: (typeof args.title_ar === "string" ? args.title_ar.trim() : null) || name,
      description_en,
      description_ar,
      description: description_en,
      category,
      sku: typeof args.sku === "string" ? args.sku.trim() || null : null,
      price_egp,
      compare_price_egp:
        args.compare_price_egp != null && num(args.compare_price_egp) > 0
          ? num(args.compare_price_egp)
          : null,
      stock,
      is_active,
      image_url,
      images,
      video_url: null,
      badges,
      seasons,
      weight_grams:
        args.weight_grams != null ? Math.max(1, Math.floor(num(args.weight_grams))) : null,
      pieces_count:
        args.pieces_count != null ? Math.max(1, Math.floor(num(args.pieces_count))) : null,
      dietary: parseList(args.dietary ?? args.ingredients),
    });

    const sb = createSupabaseAdminClient();
    const inserted = await insertProductWithSlugRetry(
      sb,
      name,
      typeof args.slug === "string" ? args.slug.trim() : undefined,
      buildRow,
    );
    if ("error" in inserted) {
      const code = String(inserted.error?.code ?? "");
      return {
        warning:
          code === "23505"
            ? "Slug or SKU already exists — try a different name or slug."
            : inserted.error?.message ?? "Failed to create product.",
      };
    }
    const data = inserted.data;

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.product.create",
      module: "products",
      entity_id: data.id as string,
      after: data,
      metadata: { source: "copilot", supabase_user_id: actor.supabase_user_id },
    });

    await revalidateProductPaths(data.slug as string);

    return {
      ok: true,
      action: "create_product",
      product: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        price_egp: data.price_egp,
        stock: data.stock,
        category: data.category,
        badges: data.badges,
      },
      image_prompt: typeof args.image_prompt === "string" ? args.image_prompt : `Premium food photo: ${name}, warm bakery lighting, Cookie Bite style`,
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "create_product failed" };
  }
}

export async function update_product(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  if (!canWrite(actor)) {
    return { warning: "Only owner/admin can update products via copilot." };
  }
  try {
    const resolved = await resolveProductId(args);
    if ("warning" in resolved) return resolved;

    const patch: Record<string, unknown> = {};
    if (typeof args.name === "string" && args.name.trim()) patch.name = args.name.trim();
    if (typeof args.title_en === "string") patch.title_en = args.title_en.trim() || null;
    if (typeof args.title_ar === "string") patch.title_ar = args.title_ar.trim() || null;
    if (typeof args.description_en === "string") {
      patch.description_en = args.description_en.trim() || null;
      patch.description = args.description_en.trim() || null;
    }
    if (typeof args.description_ar === "string") patch.description_ar = args.description_ar.trim() || null;
    if (args.price_egp != null) {
      const p = num(args.price_egp);
      if (p <= 0) return { warning: "price_egp must be positive." };
      patch.price_egp = p;
    }
    if (args.stock != null) patch.stock = Math.max(0, Math.floor(num(args.stock)));
    if (typeof args.category === "string") patch.category = args.category.trim() || null;
    if (args.is_active === true || args.is_active === false) patch.is_active = args.is_active;
    if (args.badges != null) patch.badges = parseList(args.badges);
    if (args.seasons != null) patch.seasons = parseList(args.seasons);
    if (args.compare_price_egp != null) {
      const cp = num(args.compare_price_egp);
      patch.compare_price_egp = cp > 0 ? cp : null;
    }
    if (typeof args.slug === "string" && args.slug.trim()) {
      patch.slug = deriveProductSlug("", args.slug.trim());
    }

    if (Object.keys(patch).length === 0) {
      return { warning: "No fields to update — pass price_egp, name, description_en, etc." };
    }

    const sb = createSupabaseAdminClient();
    const { data: before } = await sb.from("products").select("*").eq("id", resolved.id).maybeSingle();
    if (!before) return { warning: "Product not found." };

    const { data: after, error } = await sb
      .from("products")
      .update(patch)
      .eq("id", resolved.id)
      .select("*")
      .single();

    if (error || !after) return { warning: error?.message ?? "Update failed." };

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.product.update",
      module: "products",
      entity_id: resolved.id,
      before,
      after,
      metadata: { source: "copilot", patch, clerk_user_id: actor.clerk_user_id },
    });

    await revalidateProductPaths(after.slug as string);

    return {
      ok: true,
      action: "update_product",
      product_id: resolved.id,
      name: after.name,
      updated_fields: Object.keys(patch),
      product: {
        id: after.id,
        name: after.name,
        price_egp: after.price_egp,
        stock: after.stock,
      },
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "update_product failed" };
  }
}

export async function delete_product(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  if (!canWrite(actor)) {
    return { warning: "Only owner/admin can delete products via copilot." };
  }
  try {
    const confirm = args.confirm === true;
    const resolved = await resolveProductId(args);
    if ("warning" in resolved) return resolved;

    if (!confirm) {
      return {
        dry_run: true,
        action: "delete_product",
        product_id: resolved.id,
        name: resolved.name,
        hint: "Re-call with confirm:true only after the admin explicitly approves deletion.",
      };
    }

    const sb = createSupabaseAdminClient();
    const { data: before } = await sb.from("products").select("*").eq("id", resolved.id).maybeSingle();
    if (!before) return { warning: "Product not found." };

    const { error } = await sb.from("products").delete().eq("id", resolved.id);
    if (error) return { warning: error.message };

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.product.delete",
      module: "products",
      entity_id: resolved.id,
      before,
      metadata: { source: "copilot", supabase_user_id: actor.supabase_user_id },
    });

    await revalidateProductPaths(before.slug as string);

    return { ok: true, action: "delete_product", product_id: resolved.id, name: resolved.name };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "delete_product failed" };
  }
}

export async function update_order_status(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  if (!canWrite(actor)) {
    return { warning: "Only owner/admin can update orders via copilot." };
  }
  try {
    const status = typeof args.status === "string" ? args.status.trim() : "";
    const allowed = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
    if (!allowed.includes(status)) {
      return { warning: `status must be one of: ${allowed.join(", ")}` };
    }

    const resolved = await resolveOrderId(args);
    if ("warning" in resolved) return resolved;

    if (status === "cancelled" && args.confirm !== true) {
      return {
        dry_run: true,
        action: "update_order_status",
        order_id: resolved.id,
        status,
        hint: "Cancellation requires confirm:true after explicit admin approval.",
      };
    }

    const sb = createSupabaseAdminClient();
    const { data: before } = await sb.from("orders").select("*").eq("id", resolved.id).maybeSingle();
    if (!before) return { warning: "Order not found." };

    const { data: after, error } = await sb
      .from("orders")
      .update({ status })
      .eq("id", resolved.id)
      .select("*")
      .single();

    if (error || !after) return { warning: error?.message ?? "Failed to update order." };

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.order.update_status",
      module: "orders",
      entity_id: resolved.id,
      before,
      after,
      metadata: { source: "copilot", status, clerk_user_id: actor.clerk_user_id },
    });

    return {
      ok: true,
      action: "update_order_status",
      order_id: resolved.id,
      status: after.status,
      order_number: after.order_number ?? after.order_code,
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "update_order_status failed" };
  }
}

export async function create_discount(args: Record<string, unknown>, actor: CopilotToolActor): Promise<Json> {
  if (!canWrite(actor)) {
    return { warning: "Only owner/admin can create discounts via copilot." };
  }
  try {
    const type = args.type === "fixed" ? "fixed" : "percent";
    const value = num(args.value ?? args.discount_percent ?? args.discount_value);
    if (value <= 0) return { warning: "value must be positive." };
    if (type === "percent" && value > 100) return { warning: "Percent discount cannot exceed 100." };

    let code =
      typeof args.code === "string" ? args.code.trim().toUpperCase().replace(/\s+/g, "") : "";
    if (!code) {
      const prefix = type === "percent" ? `SAVE${Math.round(value)}` : `OFF${Math.round(value)}`;
      code = `${prefix}${Date.now().toString(36).slice(-4).toUpperCase()}`;
    }

    const expiresInDays = Math.max(1, Math.min(365, Math.floor(num(args.expires_in_days ?? 7))));
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + expiresInDays);

    const sb = createSupabaseAdminClient();
    const { data, error } = await sb
      .from("promo_codes")
      .insert({
        code,
        type,
        value,
        valid_from: new Date().toISOString(),
        valid_until: ends.toISOString(),
        max_uses: args.max_uses != null ? Math.max(1, Math.floor(num(args.max_uses))) : null,
        min_order_amount_egp: args.min_order_amount_egp != null ? num(args.min_order_amount_egp) : 0,
        is_active: args.active !== false,
      })
      .select("*")
      .single();

    if (error || !data) {
      return { warning: error?.message ?? "Failed to create discount." };
    }

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "copilot.discount.create",
      module: "discounts",
      entity_id: data.id as string,
      after: data,
      metadata: { source: "copilot", supabase_user_id: actor.supabase_user_id },
    });

    return {
      ok: true,
      action: "create_discount",
      discount: {
        code: data.code,
        type: data.type,
        value: data.value,
        valid_until: data.valid_until,
        is_active: data.is_active,
      },
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "create_discount failed" };
  }
}
