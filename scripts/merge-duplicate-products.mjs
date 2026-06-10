#!/usr/bin/env node
/**
 * دمج منتجات مكررة (نفس المنتج بأحجام مختلفة) في منتج أب واحد + أحجام (product_variants).
 *
 * لكل منتج مكرر:
 *   - يُنشأ صف في product_variants تحت المنتج الأب (وزن/قطع/سعر/مخزون/SKU من المكرر)
 *   - يُعطَّل المنتج المكرر (is_active = false)
 *   - يُحدَّث سعر/مخزون المنتج الأب (أقل سعر + مجموع المخزون)
 *
 * الطلبات القديمة تبقى على product_snapshot كما هي.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN
 *
 * Usage (dry-run افتراضي — لا يكتب شيئاً):
 *   node scripts/merge-duplicate-products.mjs --parent=choco-chip-small --variants=choco-chip-medium,choco-chip-large
 *   node scripts/merge-duplicate-products.mjs --parent=<slug> --variants=<slug,slug> --apply
 *
 * ملاحظات:
 *   - --parent و--variants يقبلان slug أو UUID.
 *   - المنتج الأب نفسه لا يتحوّل لحجم؛ مرّره ضمن --variants فقط إذا أردت تحويله أيضاً.
 */
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

function parseArgs(argv) {
  const out = { parent: null, variants: [], apply: false };
  for (const arg of argv) {
    if (arg.startsWith("--parent=")) out.parent = arg.slice("--parent=".length).trim();
    else if (arg.startsWith("--variants=")) {
      out.variants = arg
        .slice("--variants=".length)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (arg === "--apply") out.apply = true;
  }
  return out;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fetchProduct(keyRaw) {
  const key = decodeURIComponent(keyRaw);
  const col = UUID_RE.test(key) ? "id" : "slug";
  const data = await runDatabaseQuery(
    `select id, slug, name, title_en, title_ar, price_egp, compare_price_egp,
            stock, weight_grams, pieces_count, sku, is_active
     from public.products
     where ${col} = ${sqlQuote(key)}
     limit 1;`,
    { readOnly: true, label: `fetch-product-${key}` },
  );
  const rows = extractRows(data);
  return rows[0] ?? null;
}

async function main() {
  loadProjectEnv(process.cwd());
  const { ref } = getSupabaseManagementConfig();
  const { parent, variants, apply } = parseArgs(process.argv.slice(2));

  if (!parent || variants.length === 0) {
    console.error(
      "Usage: node scripts/merge-duplicate-products.mjs --parent=<slug|id> --variants=<slug|id,...> [--apply]",
    );
    process.exit(1);
  }

  console.log(`[merge] project ref=${ref} mode=${apply ? "APPLY" : "DRY-RUN"}`);

  const parentRow = await fetchProduct(parent);
  if (!parentRow) {
    console.error(`[merge] parent not found: ${parent}`);
    process.exit(1);
  }
  console.log(`[merge] parent: ${parentRow.slug} (${parentRow.id})`);

  const variantRows = [];
  for (const key of variants) {
    const row = await fetchProduct(key);
    if (!row) {
      console.error(`[merge] variant product not found: ${key}`);
      process.exit(1);
    }
    if (row.id === parentRow.id) {
      console.error(`[merge] skip: ${key} is the parent itself`);
      continue;
    }
    variantRows.push(row);
  }

  if (variantRows.length === 0) {
    console.error("[merge] no valid variant products to merge");
    process.exit(1);
  }

  // أحجام موجودة مسبقاً على الأب — نحدد sort_order التالي
  const existing = extractRows(
    await runDatabaseQuery(
      `select count(*)::int as n from public.product_variants where product_id = ${sqlQuote(parentRow.id)};`,
      { readOnly: true, label: "count-existing-variants" },
    ),
  );
  let sortOrder = Number(existing[0]?.n ?? 0);

  const plannedVariants = variantRows.map((row) => {
    const name = (row.title_ar || row.title_en || row.name || row.slug).trim();
    return {
      product_id: parentRow.id,
      source_slug: row.slug,
      source_id: row.id,
      name,
      sku: row.sku || null,
      price_egp: row.price_egp != null ? Number(row.price_egp) : null,
      compare_price_egp: row.compare_price_egp != null ? Number(row.compare_price_egp) : null,
      stock: Math.max(0, Math.floor(Number(row.stock) || 0)),
      weight_grams: row.weight_grams != null ? Number(row.weight_grams) : null,
      pieces_count: row.pieces_count != null ? Number(row.pieces_count) : null,
      sort_order: sortOrder++,
    };
  });

  console.log("[merge] planned variants:");
  for (const v of plannedVariants) {
    console.log(
      `  - ${v.name} | price=${v.price_egp ?? "—"} stock=${v.stock} weight=${v.weight_grams ?? "—"} pcs=${v.pieces_count ?? "—"} (from ${v.source_slug})`,
    );
  }

  const prices = plannedVariants
    .map((v) => v.price_egp)
    .filter((p) => p != null && Number.isFinite(p));
  if (parentRow.price_egp != null) prices.push(Number(parentRow.price_egp));
  const minPrice = prices.length ? Math.min(...prices) : Number(parentRow.price_egp ?? 0);
  const totalStock =
    plannedVariants.reduce((s, v) => s + v.stock, 0) + Math.max(0, Number(parentRow.stock) || 0);

  console.log(`[merge] parent will become: price_egp=${minPrice} stock=${totalStock}`);

  if (!apply) {
    console.log("[merge] DRY-RUN — أعد التشغيل بـ --apply للتنفيذ.");
    return;
  }

  // 1) إدراج الأحجام
  const valuesSql = plannedVariants
    .map((v) => {
      const opts = JSON.stringify({ size: v.name });
      return `(${sqlQuote(v.product_id)}, ${sqlQuote(v.name)}, ${
        v.sku ? sqlQuote(v.sku) : "null"
      }, ${v.price_egp != null ? v.price_egp : "null"}, ${
        v.compare_price_egp != null ? v.compare_price_egp : "null"
      }, ${v.stock}, ${v.weight_grams != null ? v.weight_grams : "null"}, ${
        v.pieces_count != null ? v.pieces_count : "null"
      }, ${sqlQuote(opts)}::jsonb, ${v.sort_order}, true)`;
    })
    .join(",\n    ");

  await runDatabaseQuery(
    `insert into public.product_variants
       (product_id, name, sku, price_egp, compare_price_egp, stock, weight_grams, pieces_count, options, sort_order, is_active)
     values
    ${valuesSql};`,
    { label: "insert-variants" },
  );
  console.log(`[merge] inserted ${plannedVariants.length} variants`);

  // 2) تعطيل المنتجات المكررة
  const dupIds = variantRows.map((r) => sqlQuote(r.id)).join(", ");
  await runDatabaseQuery(
    `update public.products set is_active = false where id in (${dupIds});`,
    { label: "deactivate-duplicates" },
  );
  console.log(`[merge] deactivated ${variantRows.length} duplicate products`);

  // 3) تحديث المنتج الأب
  await runDatabaseQuery(
    `update public.products
       set price_egp = ${minPrice}, stock = ${totalStock}
     where id = ${sqlQuote(parentRow.id)};`,
    { label: "update-parent" },
  );
  console.log(`[merge] updated parent ${parentRow.slug}`);
  console.log("[merge] done.");
}

main().catch((err) => {
  console.error("[merge] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
