/**
 * Master operator tools — maps SaaS-style tool names to Cookie Bite APIs.
 */

import { generateProductFieldsFromName } from "@/lib/admin/product-auto-fill";
import { playfulLuxuryColors } from "@/lib/design-tokens";
import {
  create_product,
  delete_product,
  update_order_status,
  update_product,
} from "@/lib/admin/copilot/write-handlers";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";
import type { CopilotToolActor } from "@/lib/admin/copilot/tools";
import { MASTER_TOOL_META } from "@/lib/admin/copilot/tool-registry";
import { previewBlock, shouldPreview } from "@/lib/admin/copilot/preview";
import {
  loadOperatorMemory,
  pageDraftKey,
  saveOperatorMemory,
  type OperatorMemory,
} from "@/lib/admin/copilot/memory";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeProductImages, primaryImageFromProduct } from "@/lib/products/media";
import { fetchMediaLibrary } from "@/lib/admin/media-library";
import {
  removeMediaUrlFromProducts,
  replaceMediaUrlInProducts,
} from "@/lib/admin/media-mutations";
import type { CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";
import { destroyCloudinaryAsset } from "@/lib/cloudinary/manage-resource";
import {
  buildEnhancedDeliveryUrl,
  type EnhanceOperation,
} from "@/lib/cloudinary/enhance-delivery";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusToActive(status: unknown): boolean {
  const s = typeof status === "string" ? status.trim().toLowerCase() : "active";
  if (s === "draft" || s === "archived") return false;
  return true;
}

export async function add_product(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const meta = MASTER_TOOL_META.add_product;
  const name = typeof args.name === "string" ? args.name.trim() : "";
  const price = num(args.price ?? args.price_egp);
  if (!name) return { warning: "name is required." };
  if (price <= 0) return { warning: "price must be positive (EGP)." };

  const planned = {
    name,
    price_egp: price,
    category: typeof args.category === "string" ? args.category : "Cookies",
    stock: args.stock != null ? Math.max(0, Math.floor(num(args.stock))) : 24,
    is_active: statusToActive(args.status),
    description_en: typeof args.description === "string" ? args.description : undefined,
    description_ar: typeof args.description_ar === "string" ? args.description_ar : undefined,
    images: Array.isArray(args.images) ? args.images : undefined,
    badges: typeof args.badges === "string" ? args.badges : undefined,
    seasons: typeof args.seasons === "string" ? args.seasons : undefined,
  };

  if (shouldPreview(args, meta)) {
    return previewBlock("add_product", planned);
  }

  return create_product(
    {
      name: planned.name,
      price_egp: planned.price_egp,
      category: planned.category,
      stock: planned.stock,
      is_active: planned.is_active,
      description_en: planned.description_en,
      description_ar: planned.description_ar,
      badges: planned.badges,
      seasons: planned.seasons,
      theme: !planned.description_en ? planned.name : undefined,
    },
    actor,
  );
}

export async function edit_product(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const meta = MASTER_TOOL_META.edit_product;
  const product_id = typeof args.product_id === "string" ? args.product_id.trim() : "";
  const updates =
    args.updates && typeof args.updates === "object" && !Array.isArray(args.updates)
      ? (args.updates as Record<string, unknown>)
      : {};

  if (!product_id && !args.query) {
    return { warning: "product_id or query (name search) is required." };
  }

  const planned = { product_id: product_id || null, query: args.query, patch: updates };
  if (shouldPreview(args, meta)) {
    return previewBlock("edit_product", planned);
  }

  const patch: Record<string, unknown> = { ...updates };
  if (updates.price != null) patch.price_egp = num(updates.price);
  if (updates.description != null) patch.description_en = updates.description;
  if (updates.status != null) patch.is_active = statusToActive(updates.status);

  return update_product(
    {
      product_id: product_id || undefined,
      query: typeof args.query === "string" ? args.query : undefined,
      ...patch,
    },
    actor,
  );
}

export async function list_products(
  args: Record<string, unknown>,
  _actor: CopilotToolActor,
): Promise<Json> {
  void _actor;
  try {
    const sb = createSupabaseAdminClient();
    const status = typeof args.status === "string" ? args.status.toLowerCase() : "active";
    const query =
      (typeof args.query === "string" ? args.query.trim() : "") ||
      (typeof args.category === "string" ? args.category.trim() : "");
    const limit = Math.max(1, Math.min(50, num(args.limit ?? 20)));
    const lowStock =
      args.low_stock_threshold != null ? Math.max(0, num(args.low_stock_threshold)) : null;

    let q = sb
      .from("products")
      .select("id,name,slug,price_egp,stock,category,is_active,created_at")
      .limit(limit)
      .order("created_at", { ascending: false });

    if (status === "active") q = q.eq("is_active", true);
    else if (status === "draft" || status === "archived") q = q.eq("is_active", false);
    if (lowStock != null) q = q.lte("stock", lowStock);
    if (query) q = q.or(`name.ilike.%${query}%,category.ilike.%${query}%`);

    const { data, error } = await q;
    if (error) return { warning: error.message, products: [] };

    const products = (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price_egp: num(p.price_egp),
      stock: num(p.stock),
      category: p.category,
      status: p.is_active ? "active" : "draft",
    }));

    return { ok: true, count: products.length, products };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "list_products failed", products: [] };
  }
}

export async function generate_product_content(
  args: Record<string, unknown>,
  _actor: CopilotToolActor,
): Promise<Json> {
  void _actor;
  const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
  if (!prompt) return { warning: "prompt is required." };

  const tone = typeof args.tone === "string" ? args.tone : "playful luxury";
  const generated = generateProductFieldsFromName(prompt);
  const memory = await loadOperatorMemory(_actor.clerk_user_id);

  return {
    ok: true,
    action: "generate_product_content",
    tone: tone || memory.brand.tone,
    content: {
      name: generated.name ?? prompt,
      slug: generated.slug,
      title_en: generated.title_en,
      title_ar: generated.title_ar,
      description_en: generated.description_en,
      description_ar: generated.description_ar,
      category: generated.category,
      price_egp: generated.price_egp,
      compare_price_egp: generated.compare_price_egp,
      stock: generated.stock,
      badges: generated.badges,
      seasons: generated.seasons,
      ingredients: generated.ingredients,
      meta_title: generated.meta_title,
      meta_description: generated.meta_description,
    },
    next_step: "Call add_product with confirm:true to publish, or edit fields first.",
  };
}

export async function generate_seo_content(
  args: Record<string, unknown>,
  _actor: CopilotToolActor,
): Promise<Json> {
  void _actor;
  const topic = typeof args.topic === "string" ? args.topic.trim() : "";
  if (!topic) return { warning: "topic is required." };

  const lang = typeof args.language === "string" ? args.language : "bilingual";
  const titleEn = `${topic} | Cookie Bite — Artisan Cookies New Cairo`.slice(0, 70);
  const titleAr = `${topic} | كوكي بايت — كوكيز يدوية القاهرة الجديدة`.slice(0, 70);
  const descEn =
    `Order ${topic} from Cookie Bite. Small-batch luxury cookies, gift boxes, and same-week delivery in New Cairo.`.slice(
      0,
      160,
    );
  const descAr =
    `اطلب ${topic} من كوكي بايت. كوكيز فاخرة يدوية الصنع وصناديق هدايا مع توصيل سريع في القاهرة الجديدة.`.slice(
      0,
      160,
    );

  return {
    ok: true,
    action: "generate_seo_content",
    language: lang,
    seo: {
      title_en: titleEn,
      title_ar: titleAr,
      meta_description_en: descEn,
      meta_description_ar: descAr,
      keywords: [
        "cookie bite",
        "cookies new cairo",
        "luxury cookies egypt",
        topic.toLowerCase(),
        "كوكي بايت",
        "كوكيز القاهرة الجديدة",
      ],
    },
  };
}

export async function analyze_website(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const focus = typeof args.focus === "string" ? args.focus : "all";
  const memory = await loadOperatorMemory(actor.clerk_user_id);

  const findings: Array<{ area: string; score: number; notes: string[] }> = [
    {
      area: "ui",
      score: 88,
      notes: [
        `Brand palette locked: cream ${playfulLuxuryColors.cream}, caramel ${playfulLuxuryColors.caramel}.`,
        "Storefront uses Playful Luxury tokens — keep admin drawer on light surface in dark mode.",
      ],
    },
    {
      area: "ux",
      score: 85,
      notes: [
        "RTL Arabic primary; checkout and profile completion are optional-field friendly.",
        "Use list_products before edit/delete to avoid wrong IDs.",
      ],
    },
    {
      area: "seo",
      score: 82,
      notes: [
        "Product slugs are Latin-safe; use generate_seo_content for meta titles.",
        "Blog/CMS via Sanity Studio — publish long-tail content there.",
      ],
    },
    {
      area: "conversion",
      score: 84,
      notes: [
        "WhatsApp CTA + gift boxes + seasonal badges drive urgency.",
        `Stored tone: ${memory.brand.tone}`,
      ],
    },
  ];

  const filtered =
    focus === "all" ? findings : findings.filter((f) => f.area === focus || focus === "performance" && f.area === "ux");

  return { ok: true, action: "analyze_website", focus, findings: filtered };
}

export async function apply_theme(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const meta = MASTER_TOOL_META.apply_theme;
  const theme_name = typeof args.theme_name === "string" ? args.theme_name.trim() : "playful_luxury";
  const mode = typeof args.mode === "string" ? args.mode : "playful_luxury";

  const tokenPatch = {
    cream: playfulLuxuryColors.cream,
    caramel: mode === "dark" ? playfulLuxuryColors.caramel : playfulLuxuryColors.caramel,
    text_primary: mode === "dark" ? "#f7f3ef" : playfulLuxuryColors.textPrimary,
    accent: playfulLuxuryColors.caramel,
  };

  const planned = { theme_name, mode, tokens: tokenPatch };

  if (shouldPreview(args, meta)) {
    return previewBlock(
      "apply_theme",
      planned,
      "Re-call with confirm:true to save theme to operator memory (CSS deploy still via codebase).",
    );
  }

  await saveOperatorMemory(actor.clerk_user_id, {
    brand: {
      tone: `${theme_name} (${mode})`,
      language: "bilingual",
      colors: tokenPatch,
      layout_notes: planned.mode === "luxury" ? "Editorial serif, wide margins" : memoryDefaultLayout(mode),
    },
  });

  return {
    ok: true,
    action: "apply_theme",
    theme_name,
    mode,
    tokens: tokenPatch,
    note: "Saved to operator memory. Global CSS still updated via app/styles/playful-luxury.css in codebase.",
  };
}

function memoryDefaultLayout(mode: string): string {
  if (mode === "modern") return "Tight grids, sans accents, bold CTAs.";
  if (mode === "luxury") return "Editorial spacing, gold accents, minimal copy.";
  return "Playful Luxury — warm cream, caramel CTAs, bilingual.";
}

export async function generate_image(
  args: Record<string, unknown>,
  _actor: CopilotToolActor,
): Promise<Json> {
  void _actor;
  const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
  if (!prompt) return { warning: "prompt is required." };
  const style = typeof args.style === "string" ? args.style : "premium food photography";
  const size = typeof args.size === "string" ? args.size : "1200x1200";

  return {
    ok: true,
    action: "generate_image",
    image_prompt: `${prompt}. Style: ${style}. Cookie Bite brand — warm bakery light, shallow depth of field, no text overlay.`,
    size,
    upload_hint: "Upload via /admin/products → product media, or paste URL after Cloudinary upload.",
  };
}

async function cmsDraft(
  actor: CopilotToolActor,
  page: string,
  patch: Partial<OperatorMemory["page_drafts"][string]>,
  args: Record<string, unknown>,
  tool: string,
): Promise<Json> {
  const meta = MASTER_TOOL_META[tool];
  const key = pageDraftKey(page);
  const memory = await loadOperatorMemory(actor.clerk_user_id);
  const current = memory.page_drafts[key] ?? { updated_at: new Date().toISOString() };

  const planned = { page, ...patch };

  if (shouldPreview(args, meta)) {
    return previewBlock(tool, planned, "CMS page builder is draft-only until Sanity/section API ships. confirm:true saves draft to operator memory.");
  }

  const nextDraft = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await saveOperatorMemory(actor.clerk_user_id, {
    page_drafts: { [key]: nextDraft },
  });

  return {
    ok: true,
    action: tool,
    page,
    draft: nextDraft,
    cms_url: "/admin/cms",
    note: "Draft saved. Wire to Sanity Studio for production publish.",
  };
}

export async function update_page_content(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const page = typeof args.page === "string" ? args.page.trim() : "";
  const section = typeof args.section === "string" ? args.section.trim() : "";
  const content = typeof args.content === "string" ? args.content : "";
  if (!page || !section) return { warning: "page and section are required." };

  const memory = await loadOperatorMemory(actor.clerk_user_id);
  const key = pageDraftKey(page);
  const current = memory.page_drafts[key] ?? { updated_at: new Date().toISOString() };
  const contentMap = { ...(current.content ?? {}), [section]: content };

  return cmsDraft(actor, page, { content: contentMap }, args, "update_page_content");
}

export async function update_page_style(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const page = typeof args.page === "string" ? args.page.trim() : "";
  const section = typeof args.section === "string" ? args.section.trim() : "";
  const styles =
    args.styles && typeof args.styles === "object" && !Array.isArray(args.styles)
      ? (args.styles as Record<string, string>)
      : null;
  if (!page || !section || !styles) return { warning: "page, section, and styles object are required." };

  const memory = await loadOperatorMemory(actor.clerk_user_id);
  const key = pageDraftKey(page);
  const current = memory.page_drafts[key] ?? { updated_at: new Date().toISOString() };
  const styleMap = { ...(current.styles ?? {}), [section]: styles };

  return cmsDraft(actor, page, { styles: styleMap }, args, "update_page_style");
}

export async function add_section(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const page = typeof args.page === "string" ? args.page.trim() : "";
  const type = typeof args.type === "string" ? args.type.trim() : "";
  if (!page || !type) return { warning: "page and type are required." };

  const id = `${type}-${Date.now().toString(36)}`;
  const memory = await loadOperatorMemory(actor.clerk_user_id);
  const key = pageDraftKey(page);
  const current = memory.page_drafts[key] ?? { sections: [], updated_at: new Date().toISOString() };
  const sections = [...(current.sections ?? []), { id, type, content: args.content ?? {} }];

  return cmsDraft(actor, page, { sections }, args, "add_section");
}

export async function remove_section(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const page = typeof args.page === "string" ? args.page.trim() : "";
  const section_id = typeof args.section_id === "string" ? args.section_id.trim() : "";
  if (!page || !section_id) return { warning: "page and section_id are required." };

  if (args.confirm !== true) {
    return previewBlock(
      "remove_section",
      { page, section_id },
      "Destructive — re-call with confirm:true after admin approval.",
    );
  }

  const memory = await loadOperatorMemory(actor.clerk_user_id);
  const key = pageDraftKey(page);
  const current = memory.page_drafts[key] ?? { sections: [] };
  const sections = (current.sections ?? []).filter((s) => s.id !== section_id);

  return cmsDraft(actor, page, { sections }, { ...args, confirm: true, preview: false }, "remove_section");
}

export async function reorder_sections(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const page = typeof args.page === "string" ? args.page.trim() : "";
  const order = Array.isArray(args.order) ? args.order.map(String) : [];
  if (!page || order.length === 0) return { warning: "page and order array are required." };

  return cmsDraft(actor, page, { order }, args, "reorder_sections");
}

export async function manage_orders(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  void actor;
  const action = typeof args.action === "string" ? args.action : "list";

  if (action === "update_status") {
    return update_order_status(
      {
        order_id: args.order_id,
        order_number: args.order_number,
        status: args.status,
        confirm: args.confirm,
      },
      actor,
    );
  }

  try {
    const sb = createSupabaseAdminClient();
    const days = Math.max(1, Math.min(30, num(args.days ?? 7)));
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);
    let q = sb
      .from("orders")
      .select("id,order_number,status,payment_status,total_egp,created_at")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (typeof args.status === "string" && args.status.trim()) {
      q = q.eq("status", args.status.trim());
    }
    const { data, error } = await q;
    if (error) return { warning: error.message, orders: [] };
    return { ok: true, action: "list", count: data?.length ?? 0, orders: data ?? [] };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "manage_orders failed", orders: [] };
  }
}

export async function manage_users(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  void actor;
  const action = typeof args.action === "string" ? args.action : "list";

  if (action === "ban" || action === "promote") {
    if (args.confirm !== true) {
      return previewBlock(
        "manage_users",
        { action, user_id: args.user_id },
        "Re-call with confirm:true. Role changes use /admin/roles — not automated yet.",
      );
    }
    return {
      warning:
        "ban/promote not wired to API yet. Open /admin/roles to change staff roles, or /admin/customers for CRM notes.",
    };
  }

  try {
    const sb = createSupabaseAdminClient();
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const userId = typeof args.user_id === "string" ? args.user_id.trim() : "";
    let q = sb
      .from("users")
      .select("id,email,full_name,phone,points,created_at")
      .eq("role", "customer")
      .limit(20)
      .order("created_at", { ascending: false });
    if (userId) q = q.eq("id", userId);
    else if (query) {
      const clause = buildIlikeOrClause(["email", "full_name", "phone"], query);
      if (clause) q = q.or(clause);
    }
    const { data, error } = await q;
    if (error) return { warning: error.message, users: [] };
    return { ok: true, action: "list", count: data?.length ?? 0, users: data ?? [] };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "manage_users failed", users: [] };
  }
}

export async function remember_brand_preference(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const memory = await loadOperatorMemory(actor.clerk_user_id);
  const colors =
    args.colors && typeof args.colors === "object" && !Array.isArray(args.colors)
      ? { ...memory.brand.colors, ...(args.colors as Record<string, string>) }
      : memory.brand.colors;

  const next = await saveOperatorMemory(actor.clerk_user_id, {
    brand: {
      tone: typeof args.tone === "string" ? args.tone : memory.brand.tone,
      language:
        args.language === "en" || args.language === "ar" || args.language === "bilingual"
          ? args.language
          : memory.brand.language,
      colors,
      layout_notes:
        typeof args.layout_notes === "string" ? args.layout_notes : memory.brand.layout_notes,
    },
  });

  return { ok: true, action: "remember_brand_preference", brand: next.brand };
}

export async function list_media(
  args: Record<string, unknown>,
  _actor: CopilotToolActor,
): Promise<Json> {
  const kind = typeof args.kind === "string" ? args.kind : "all";
  const limit = Math.min(50, Math.max(1, Math.floor(num(args.limit) || 20)));
  try {
    const lib = await fetchMediaLibrary();
    let items = lib.items;
    if (kind === "image" || kind === "video") {
      items = items.filter((i) => i.kind === kind);
    }
    return {
      ok: true,
      configured: lib.configured,
      count: items.length,
      product_only_count: lib.productOnlyCount,
      items: items.slice(0, limit).map((i) => ({
        id: i.id,
        url: i.url,
        public_id: i.publicId,
        kind: i.kind,
        source: i.source,
        used_by_count: i.usedBy.length,
        used_by: i.usedBy.slice(0, 3),
      })),
      ui: "/admin/media",
    };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "list_media failed", items: [] };
  }
}

export async function delete_media(
  args: Record<string, unknown>,
  actor: CopilotToolActor,
): Promise<Json> {
  const meta = MASTER_TOOL_META.delete_media;
  const url = typeof args.url === "string" ? args.url.trim() : "";
  const publicId = typeof args.public_id === "string" ? args.public_id.trim() : "";
  const kind: CloudinaryUploadKind = args.kind === "video" ? "video" : "image";

  if (!url && !publicId) return { warning: "url or public_id is required." };

  const planned = { url, public_id: publicId || null, kind, unlink_products: true };

  if (shouldPreview(args, meta)) {
    return previewBlock("delete_media", planned);
  }

  try {
    let productsUpdated = 0;
    const targetUrl = url || (await fetchMediaLibrary()).items.find((i) => i.publicId === publicId)?.url;
    if (targetUrl) {
      productsUpdated = await removeMediaUrlFromProducts(targetUrl);
    }
    if (publicId) {
      await destroyCloudinaryAsset(publicId, kind);
    }
    return { ok: true, destroyed: Boolean(publicId), productsUpdated, url: targetUrl };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "delete_media failed" };
  }
}

export async function replace_media_url(
  args: Record<string, unknown>,
  _actor: CopilotToolActor,
): Promise<Json> {
  const meta = MASTER_TOOL_META.replace_media_url;
  const oldUrl = typeof args.old_url === "string" ? args.old_url.trim() : "";
  const newUrl = typeof args.new_url === "string" ? args.new_url.trim() : "";
  if (!oldUrl || !newUrl) return { warning: "old_url and new_url are required." };

  if (shouldPreview(args, meta)) {
    return previewBlock("replace_media_url", { old_url: oldUrl, new_url: newUrl });
  }

  try {
    const productsUpdated = await replaceMediaUrlInProducts(oldUrl, newUrl);
    return { ok: true, productsUpdated, old_url: oldUrl, new_url: newUrl };
  } catch (e) {
    return { warning: e instanceof Error ? e.message : "replace_media_url failed" };
  }
}

export async function enhance_media(args: Record<string, unknown>): Promise<Json> {
  const imageUrl = typeof args.image_url === "string" ? args.image_url.trim() : "";
  if (!imageUrl) return { warning: "image_url is required." };

  const ops = Array.isArray(args.operations)
    ? (args.operations.filter((o) => typeof o === "string") as EnhanceOperation[])
    : undefined;

  const result = buildEnhancedDeliveryUrl(imageUrl, ops);
  if ("error" in result) {
    return { warning: result.error, allowed_operations: ["upscale", "sharpen", "denoise", "color_correct"] };
  }

  return {
    ok: true,
    ...result,
    rules: [
      "No composition or subject changes",
      "No added/removed objects",
      "No stylization unless admin explicitly requests it",
    ],
  };
}

export async function fix_ui_contrast(args: Record<string, unknown>): Promise<Json> {
  const scope = typeof args.scope === "string" ? args.scope : "all";
  const checks: Array<{ area: string; issue: string; fix: string }> = [
    {
      area: "admin",
      issue: "dark: utilities on cream admin-panel-surface",
      fix: "Use text-stone-950/700 on admin panels; rely on app/styles/admin.css locks",
    },
    {
      area: "admin",
      issue: "hero panels with text-cb-text-strong on light scrim",
      fix: "Force dark text in admin-hero-surface and admin-panel-surface children",
    },
    {
      area: "storefront",
      issue: "muted text on pastel backgrounds",
      fix: "Prefer text-cb-text-strong for headings; cb-text-muted only for secondary copy",
    },
  ];

  const filtered =
    scope === "all" ? checks : checks.filter((c) => c.area === scope || scope === "admin" && c.area === "admin");

  return {
    ok: true,
    scope,
    wcag_target: "AA minimum for body text (4.5:1)",
    findings: filtered,
    apply_via: ["ui.update_page_style", "apply_theme", "manual CSS in app/styles/admin.css"],
    storefront_tokens: playfulLuxuryColors,
  };
}

/** Map product images from add_product */
export async function attach_product_images(
  productId: string,
  urls: string[],
): Promise<void> {
  if (!urls.length) return;
  const sb = createSupabaseAdminClient();
  const images = normalizeProductImages(
    urls.map((url, order) => ({ url, order })),
    urls[0],
  );
  const image_url = primaryImageFromProduct(images, urls[0]);
  await sb.from("products").update({ images, image_url }).eq("id", productId);
}

export const OPERATOR_TOOL_HANDLERS: Record<
  string,
  (args: Record<string, unknown>, actor: CopilotToolActor) => Promise<Json>
> = {
  add_product,
  edit_product,
  delete_product,
  list_products,
  generate_product_content,
  update_page_content,
  update_page_style,
  add_section,
  remove_section,
  reorder_sections,
  generate_seo_content,
  analyze_website,
  apply_theme,
  generate_image,
  manage_orders,
  manage_users,
  remember_brand_preference,
  list_media,
  delete_media,
  replace_media_url,
  enhance_media,
  fix_ui_contrast,
};
