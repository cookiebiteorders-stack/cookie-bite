"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ProductVariantFormItem } from "@/lib/admin/products-dashboard-types";
import { EMPTY_PRODUCT_VARIANT } from "@/lib/admin/products-dashboard-types";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-cb-border/70 bg-white px-2.5 py-1.5 text-xs font-medium text-cb-text-strong focus:border-cb-terracotta-dark focus:outline-none focus:ring-2 focus:ring-cb-terracotta-dark/20 dark:bg-cb-surface";

type Props = {
  variants: ProductVariantFormItem[];
  disabled?: boolean;
  onChange: (variants: ProductVariantFormItem[]) => void;
};

export function ProductVariantsEditor({ variants, disabled, onChange }: Props) {
  const update = (index: number, patch: Partial<ProductVariantFormItem>) => {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const addVariant = () => {
    onChange([...variants, { ...EMPTY_PRODUCT_VARIANT, name: `حجم ${variants.length + 1}` }]);
  };

  const removeVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-cb-border/80 bg-cb-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-cb-text-strong">الأحجام (وزن / قطع / سعر لكل حجم)</p>
          <p className="text-[11px] text-cb-text-muted">
            اختياري — عند الإضافة يُحدَّث مخزون المنتج من مجموع المتغيرات.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={addVariant}
          className="inline-flex items-center gap-1 rounded-lg border border-cb-border px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-cb-text-muted">لا variants — المنتج يستخدم SKU ومخزون واحد.</p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <div
              key={variant.id ?? `new-${index}`}
              className="grid gap-2 rounded-xl border border-cb-border/70 bg-white p-2.5 dark:bg-cb-surface md:grid-cols-6"
            >
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] font-bold text-cb-text-muted">الاسم</span>
                <input
                  className={inputClass}
                  value={variant.name}
                  disabled={disabled}
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">SKU</span>
                <input
                  className={inputClass}
                  value={variant.sku}
                  disabled={disabled}
                  onChange={(e) => update(index, { sku: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">Barcode</span>
                <input
                  className={inputClass}
                  value={variant.barcode}
                  disabled={disabled}
                  onChange={(e) => update(index, { barcode: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">السعر</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={variant.price_egp}
                  placeholder="يرث من المنتج"
                  disabled={disabled}
                  onChange={(e) => update(index, { price_egp: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">سعر المقارنة</span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={variant.compare_price_egp}
                  placeholder="قبل الخصم"
                  disabled={disabled}
                  onChange={(e) => update(index, { compare_price_egp: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">المخزون</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={variant.stock}
                  disabled={disabled}
                  onChange={(e) => update(index, { stock: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">المقاس</span>
                <input
                  className={inputClass}
                  value={variant.option_size}
                  placeholder="صغير / وسط / كبير"
                  disabled={disabled}
                  onChange={(e) => update(index, { option_size: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">الوزن (جم)</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={variant.weight_grams}
                  disabled={disabled}
                  onChange={(e) => update(index, { weight_grams: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">عدد القطع</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={variant.pieces_count}
                  disabled={disabled}
                  onChange={(e) => update(index, { pieces_count: e.target.value })}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[10px] font-bold text-cb-text-muted">اللون</span>
                <input
                  className={inputClass}
                  value={variant.option_color}
                  disabled={disabled}
                  onChange={(e) => update(index, { option_color: e.target.value })}
                />
              </label>
              <div className="flex items-end justify-between gap-2 md:col-span-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={variant.is_active}
                    disabled={disabled}
                    onChange={(e) => update(index, { is_active: e.target.checked })}
                  />
                  نشط
                </label>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeVariant(index)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-50",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function variantsToApiPayload(variants: ProductVariantFormItem[]) {
  return variants
    .filter((v) => v.name.trim())
    .map((v, index) => {
      const priceRaw = v.price_egp.trim();
      const price = priceRaw ? Number(priceRaw) : null;
      const comparePriceRaw = v.compare_price_egp.trim();
      const comparePrice = comparePriceRaw ? Number(comparePriceRaw) : null;
      const weightRaw = v.weight_grams.trim();
      const weight = weightRaw ? Number(weightRaw) : null;
      const piecesRaw = v.pieces_count.trim();
      const pieces = piecesRaw ? Number(piecesRaw) : null;
      return {
        id: v.id,
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        barcode: v.barcode.trim() || null,
        price_egp: price != null && Number.isFinite(price) && price > 0 ? price : null,
        compare_price_egp:
          comparePrice != null && Number.isFinite(comparePrice) && comparePrice > 0
            ? comparePrice
            : null,
        weight_grams:
          weight != null && Number.isFinite(weight) && weight >= 0 ? Math.floor(weight) : null,
        pieces_count:
          pieces != null && Number.isFinite(pieces) && pieces >= 0 ? Math.floor(pieces) : null,
        stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        options: {
          ...(v.option_size.trim() ? { size: v.option_size.trim() } : {}),
          ...(v.option_color.trim() ? { color: v.option_color.trim() } : {}),
        },
        sort_order: index,
        is_active: v.is_active,
      };
    });
}

export function variantsFromApiRows(
  rows: Array<{
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    price_egp: number | null;
    compare_price_egp?: number | null;
    stock: number;
    weight_grams?: number | null;
    pieces_count?: number | null;
    options?: Record<string, unknown>;
    is_active: boolean;
  }>,
): ProductVariantFormItem[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    barcode: row.barcode ?? "",
    price_egp: row.price_egp != null ? String(row.price_egp) : "",
    compare_price_egp: row.compare_price_egp != null ? String(row.compare_price_egp) : "",
    stock: String(row.stock ?? 0),
    weight_grams: row.weight_grams != null ? String(row.weight_grams) : "",
    pieces_count: row.pieces_count != null ? String(row.pieces_count) : "",
    option_size: typeof row.options?.size === "string" ? row.options.size : "",
    option_color: typeof row.options?.color === "string" ? row.options.color : "",
    is_active: row.is_active,
  }));
}
