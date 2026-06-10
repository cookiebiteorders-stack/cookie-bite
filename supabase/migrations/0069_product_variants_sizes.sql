-- =============================================================================
-- Cookie Bite — Migration 0069: Product variants as sizes
-- يحوّل product_variants لتمثيل «الأحجام» (وزن/قطع/سعر مقارنة/صورة)
-- ويربط order_items بالحجم المختار للحفاظ على لقطة (snapshot) في الطلب.
-- =============================================================================

alter table public.product_variants
  add column if not exists weight_grams integer
    check (weight_grams is null or weight_grams >= 0),
  add column if not exists pieces_count integer
    check (pieces_count is null or pieces_count >= 0),
  add column if not exists compare_price_egp numeric(10,2)
    check (compare_price_egp is null or compare_price_egp >= 0),
  add column if not exists image_url text;

alter table public.order_items
  add column if not exists variant_id uuid
    references public.product_variants(id) on delete set null,
  add column if not exists variant_snapshot jsonb;

create index if not exists idx_order_items_variant_id
  on public.order_items (variant_id)
  where variant_id is not null;

notify pgrst, 'reload schema';
